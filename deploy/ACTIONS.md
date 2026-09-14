# GitHub Actions 자동 배포

## 실행 흐름

`develop` push(PR 병합 포함) → 기존 verify 워크플로의 모바일·서버·계약 검사 →
배포 도구 검사 → amd64 이미지 빌드 → GHCR 게시 → IAP SSH로 파일 전달 → API 교체 →
DB 포함 헬스체크. `Run workflow` 수동 실행도 지원한다.

배포 대상 브랜치 이외의 실행은 건너뛴다. PR 코드 자체를 배포하지 않는다.
GitHub 기본 브랜치에 워크플로가 있어야 수동 실행 버튼을 사용할 수 있다.
병합만 허용하려면 대상 브랜치에 PR 필수 브랜치 보호를 설정한다. push 이벤트는 직접 push도 포함한다.
기존 verify의 push 실행과 배포가 호출하는 verify는 별도 실행이다. 배포는 자기 검증 결과를 기다린다.

한 서버의 배포는 직렬화하며 진행 중인 배포를 새 push 때문에 취소하지 않는다.
GitHub concurrency는 모든 중간 커밋을 FIFO로 배포하는 큐가 아니다. 대기 실행은 교체될 수 있고,
VM 접속 전에 브랜치 최신 SHA를 확인해 오래된 재실행을 차단한다. 최신 실행으로 배포한다.
실행 중 새 커밋이 들어오면 현재 배포가 끝난 후 다음 배포가 진행될 수 있다.

## GitHub 설정

Repository Settings → Secrets and variables → Actions → **Variables**:

| 이름 | 값 |
|---|---|
| `DEPLOY_BRANCH` | 지금 `develop` (미설정 시 develop), 이후 `main` |
| `GCP_PROJECT_ID` | GCP 프로젝트 ID |
| `GCP_INSTANCE` | VM 인스턴스 이름 (IP 아님) |
| `GCP_ZONE` | `us-central1-a` (미설정 시 기본값) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/프로젝트번호/locations/global/workloadIdentityPools/풀/providers/공급자` |
| `GCP_SERVICE_ACCOUNT` | 배포 전용 서비스 계정 이메일 |

`DEPLOY_BRANCH`는 **저장소 변수**로 둔다. 배포 job이 시작되기 전에 판단하므로
environment 전용 변수로 두지 않는다. 나머지는 저장소 또는 `production` environment 변수로 설정한다.
Settings → Environments에서 `production`을 만들고 배포 브랜치를 현재 선택한 브랜치로 제한한다.
완전 자동 실행을 원하면 필수 승인자를 설정하지 않는다.

GHCR 게시에는 자동 제공되는 `GITHUB_TOKEN`의 `packages: write` 권한을 사용한다.
기존 패키지가 있으면 Packages 설정에서 이 저장소의 Actions 쓰기 권한을 허용한다.
이미지 주소는 `ghcr.io/planbee-detour/planbee-api:<전체 커밋 SHA>`다.
DB 비밀번호·JWT·TourAPI 키를 GitHub에 복사하지 않는다.

## GCP 최초 설정 (운영자)

1. Compute Engine, IAM Credentials, Security Token Service, IAP, OS Login 관련 API를 활성화한다.
2. 배포용 서비스 계정과 GitHub OIDC용 Workload Identity Pool/Provider를 만든다.
   issuer는 `https://token.actions.githubusercontent.com`, subject는 `assertion.sub`를 매핑한다.
   repository_id·repository_owner_id·ref도 매핑하고 **우리 저장소·조직의 숫자 ID와
   `refs/heads/develop`**만 허용하도록 attribute condition을 제한한다.
   `production` environment를 쓰므로 subject를 단순 branch 형식이라고 가정하지 않는다.
3. 해당 저장소 principal에 배포 서비스 계정의 `roles/iam.workloadIdentityUser`를 부여한다.
   장기 서비스 계정 JSON 키는 발급하지 않는다.
4. VM에 OS Login을 켜고 배포 서비스 계정에 대상 VM의 `roles/compute.osLogin`,
   IAP 터널용 `roles/iap.tunnelResourceAccessor`를 부여한다.
   gcloud 조회에 필요한 `compute.instances.get`, `compute.instances.list`,
   `compute.projects.get`도 읽기 전용 역할/사용자 지정 역할로 허용한다.
   VM에 서비스 계정이 연결되어 있다면 그 계정에 대한 `roles/iam.serviceAccountUser`도 검토한다.
5. VM 대상 방화벽에 IAP 범위 `35.235.240.0/20`에서 TCP 22 접속을 허용한다.
   GitHub 러너 IP 전체를 허용하거나 API 8080을 공개할 필요는 없다.

참조: [Google 인증 액션](https://github.com/google-github-actions/auth),
[OS Login 설정](https://cloud.google.com/compute/docs/oslogin/set-up-oslogin),
[IAP TCP forwarding](https://cloud.google.com/iap/docs/using-tcp-forwarding).

## VM 최초 설정 (운영자)

Docker Engine, Compose 2.30 이상, `make`, `curl`을 준비한다.
자동 배포는 **OS Login이 배포 서비스 계정에 부여한 Linux 사용자**로 실행된다.
웹 SSH로 접속한 사람의 사용자명이나 홈 디렉터리와 같다고 가정하지 않는다.

- `/opt/planbee/deploy` 디렉터리를 만들고 그 배포 사용자에게 쓰기 권한을 부여한다.
- 그 사용자에게 Docker 실행 권한을 부여한다. Docker 그룹은 관리자 수준 권한이므로
  전용 배포 계정에 한정한다. 일반 `compute.osLogin`만으로 Docker 실행 권한은 생기지 않는다.
- 이 디렉터리에 배포 파일을 놓고 `make env`로 템플릿을 만든다.
  운영자가 `.env`의 `PRD_DB_*`, `JWT_SECRET`, `TOUR_API_KEY`를 채운다.
  기존 `~/planbee/deploy`를 사용했다면 운영 파일과 인증서를 해당 고정 경로로 옮긴다.
- `.env`는 배포 사용자 소유·600, `certs/supabase.crt`는 컨테이너 사용자도 읽을 수 있게 준비한다.
- **같은 배포 Linux 사용자로** `make ghcr-login GHCR_USER=패키지읽기사용자`를 실행해
  `read:packages` PAT를 입력한다. 사람 계정에서 해 둔 Docker 로그인은 공유되지 않는다.
  토큰은 운영자가 VM에 직접 설정한다. Actions는 GHCR 토큰을 VM으로 전송하지 않는다.
- 동일한 Compose 프로젝트 이름이므로 이전 수동 실행 컨테이너를 교체한다. 동시에 두 경로에서 배포하지 않는다.

전송 대상은 Makefile·스크립트·Compose·문서·예제뿐이다. 기존 `.env`와 인증서는
매번 덮어쓰지 않는다. API는 계속 localhost:8080에만 바인딩하며 공개 HTTPS는 별도 작업이다.

## main으로 전환

1. `main`에 `.github/workflows/deploy.yml`, 재사용 verify 워크플로와 `deploy/`를 포함시킨다.
2. GCP WIF 조건과 GitHub production environment의 허용 브랜치를 `main`으로 변경한다.
3. 저장소 변수 `DEPLOY_BRANCH`를 `main`으로 변경한다.
4. main에서 수동 실행하거나 다음 병합으로 배포한다. 이후 develop은 배포하지 않는다.

변수 변경 자체는 배포를 시작하지 않는다. 서버 하나에 두 브랜치를 동시에 배포하지 않는다.

## 실패·복구·검증 범위

검증이나 이미지 게시가 실패하면 VM에 접속하지 않는다. pull 실패 시 기존 API는 유지된다.
교체 후 health 실패는 Actions 실패로 보고하며 자동 DB 롤백을 하지 않는다.
이전 DB 스키마와 호환되는 이미지를 확인한 뒤 VM에서
`make rollback IMAGE_TAG=이전커밋SHA`를 실행한다. 서버는 한 컨테이너이므로 짧은 중단이 있다.

로컬 검증은 배포 도구 테스트와 구문 검사다. 실제 OIDC 권한·IAP SSH·GHCR 접근·VM 배포는
외부 설정을 마친 뒤 첫 Actions 실행으로 검증해야 한다. 워크플로 파일만 추가해도 이 설정들이 생성되지는 않는다.
