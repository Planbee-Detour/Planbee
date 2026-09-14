# 미국 VM 수동 배포

대상: Ubuntu 22.04 Minimal / e2-micro / us-central1-a / 물리 RAM 1GB,
Supabase 서울 PostgreSQL. 최초 공개 범위는 SSH 터널이다.
현재 운영 서버에 접속하거나 배포한 것은 아니다.

로컬 검증(2026-09-10): `make -f deploy/Makefile verify` 통과 — 실제 Compose 구조 검사,
Bash 구문 검사, Docker 대체 실행기를 이용한 배포 안전 동작 테스트 7건.
실제 이미지 빌드·GHCR 게시·Supabase 연결·VM 메모리 검증은 최초 배포 때 수행한다.

운영은 `make -f deploy/Makefile`을 사용한다. 이 Makefile은 루트의 개발용 `.env`를
읽지 않으며, `deploy/`만 VM에 전달해 그 안에서 `make`를 실행할 수도 있다.
기존 `make e2e-up`은 운영에 사용하지 않는다. 자동 배포 설정은 [ACTIONS.md](ACTIONS.md)를 따른다.

## 1. 최초 준비

- VM에 Docker Engine, Compose 플러그인 **2.30 이상**, `make`, `curl`을 설치한다.
  Ubuntu 22.04용 [Docker 공식 설치 안내](https://docs.docker.com/engine/install/ubuntu/)를 따른다.
  사용할 SSH 계정에서 Docker 명령을 실행할 수 있어야 한다.
  Docker 그룹 권한은 호스트 관리자 수준이므로 전용 운영 계정으로 제한한다.
- 로컬에는 Docker Desktop 또는 Buildx를 갖춘 Docker가 필요하다. 검증에는 Python 3도 사용한다.
- VM에서 Gradle 빌드·테스트를 하지 않는다. 로컬/CI에서 `linux/amd64` 이미지를 만든다.
- GHCR 조직 패키지 생성 권한을 확인한다. 저장소는 `Planbee-Detour/Planbee`,
  이미지 이름은 **`ghcr.io/planbee-detour/planbee-api`**다.

## 2. GHCR 최초 로그인

GHCR은 미리 별도 서버를 만들 필요가 없다. 권한이 있는 계정으로 첫 이미지를 push하면
패키지가 생성된다. 로컬 발행자는 PAT(classic)의 `write:packages`,
VM 다운로드 계정은 `read:packages`와 해당 패키지 접근 권한이 필요하다.
조직이 SSO를 요구하면 토큰도 승인해야 한다.
[GitHub 공식 안내](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

로컬에서 실행한다. `사용자명`을 실제 GitHub 사용자명으로 바꾼다.
비밀번호 프롬프트에는 PAT를 직접 입력한다. 토큰을 명령 인자·문서·채팅에 적지 않는다.

```bash
make -f deploy/Makefile ghcr-login GHCR_USER=사용자명
```

이미지는 저장소 연결용 OCI label을 포함한다. 첫 게시 후 GitHub 조직의 Packages에서
저장소 연결·비공개 상태·VM 사용자 읽기 권한을 확인한다.

## 3. 로컬 검증·이미지 게시

전체 저장소 루트에서 실행한다. 개발용 검증 환경은 기존 프로젝트 설정을 사용한다.

```bash
make verify-server
make contract-check
make -f deploy/Makefile verify
make -f deploy/Makefile image-build IMAGE_TAG=release-001
make -f deploy/Makefile image-push IMAGE_TAG=release-001
```

태그는 예시다. 검증한 커밋 SHA 또는 고유 릴리스 이름으로 교체하며 **이미 게시한 태그는
덮어쓰지 않는다**. `latest`는 타깃이 거부한다. 빌드는 현재 작업 트리 내용을 사용하므로
검증한 커밋의 깨끗한 checkout에서 수행한다. ARM Mac에서도 amd64로 빌드하므로
첫 빌드는 느릴 수 있다. 테스트 성공이 빌드 타깃에 내장된 것은 아니므로 위 순서를 따른다.

## 4. VM에 배포 파일 전달

처음에는 저장소의 추적 대상 배포 파일만 `~/planbee/deploy/`로 전달한다.
로컬의 `.env`나 인증서까지 폴더째 복사하지 않는다. SSH 인증이 설정된 로컬 터미널에서:

```bash
ssh 사용자명@GCP_IP 'mkdir -p ~/planbee/deploy'
scp deploy/Makefile deploy/manage.sh deploy/compose.yml deploy/.env.example deploy/README.md deploy/test_manage.py deploy/remote-deploy.sh deploy/ACTIONS.md 사용자명@GCP_IP:~/planbee/deploy/
```

이후 VM의 SSH 터미널에서:

```bash
cd ~/planbee/deploy
make env
make ghcr-login GHCR_USER=사용자명
```

`make env`는 비밀 값이 비어 있는 `.env`를 권한 600으로 생성하고 기존 파일은 보존한다.
실제 DB·JWT 값은 사람이 VM에서 편집한다. 개발용 `.env`와 달리 운영 파일은
Compose의 **raw 형식**이므로 값에 따옴표를 붙이지 않는다. `$`, `#`도 문자 그대로 전달한다.
`source .env`나 Make `include`로 읽지 않는다.

## 5. Supabase 설정

Supabase Connect → **Session pooler / 5432**의 실제 호스트·사용자명을 사용한다.
사용자명은 대개 `postgres.<project-ref>` 형태지만 화면에 표시된 값을 따른다.
DB 비밀번호는 Supabase API 키와 다르다.

- `PRD_DB_URL`: 예제의 JDBC 형식에 실제 호스트를 넣는다. 비밀번호는 URL에 넣지 않는다.
- `PRD_DB_USERNAME`, `PRD_DB_PASSWORD`: DB 접속 정보.
- `TOUR_API_KEY`: 한국관광공사 TourAPI 키. 최신 서버에서 필수다.
- `JWT_SECRET`: 사람이 준비한 운영용 HS256 키. 재배포 때 유지한다.
- `SUPPORT_CONTACT_EMAIL`: 선택 사항. 비어 있어도 정상이다.
- `DISCORD_WEBHOOK_URL`: 선택 사항. 비어 있어도 정상이다.

Supabase Database settings의 루트 인증서를 VM의 `certs/supabase.crt`에 저장한다.
컨테이너의 비루트 사용자도 인증서를 읽을 수 있게 한다(디렉터리 755, 공개 인증서 644).
예제는 `sslmode=verify-full`과 컨테이너 경로 `/app/certs/supabase.crt`를 사용한다.
호스트명·인증서 검증 오류를 TLS 비활성화로 우회하지 않는다.
[Supabase 연결 안내](https://supabase.com/docs/guides/database/connecting-to-postgres)

기동 시 Flyway가 `db/migration`만 실행하며 E2E 시드는 제외한다. 첫 배포는 빈 전용
프로젝트에서 확인한다. 기존 데이터가 있으면 백업·권한·마이그레이션 내용을 먼저 검토한다.
현재 Flyway도 같은 Session 연결을 사용한다. 실제 연결·마이그레이션 성공은 첫 배포에서
확인해야 한다. 별도 마이그레이션 경로를 구성할 때는 direct 연결을 우선 검토한다.

Supabase를 DB로만 사용하면 Data API를 비활성화하거나 앱 테이블을 노출 대상에서 제외한다.
Spring의 JWT는 Supabase Data API를 보호하지 않는다.
[Supabase API 보안 안내](https://supabase.com/docs/guides/api/securing-your-api)

## 6. 최초 실행

VM의 `~/planbee/deploy`에서:

```bash
make deploy IMAGE_TAG=release-001
make status
make logs
```

배포는 다운로드 완료 후 기존 컨테이너를 교체한다. `/actuator/health`의 DB 포함
헬스체크를 최대 300초 기다리며, 실패 시 명령이 실패한다. 실패한 컨테이너가 남을 수 있으므로
로그를 확인하고 아래 복구 절차를 수행한다. Docker의 restart 정책은 프로세스 종료 시에
적용되며, 실행 중인 프로세스의 unhealthy 상태만으로 재시작하지는 않는다.

API는 `127.0.0.1:8080`에만 바인딩한다. GCP 방화벽에 8080이나 DB 5432를 열지 않는다.
현재 Compose에는 HTTPS 프록시가 없으며 공개 모바일 연결은 후속 단계다.
SSH는 기존 접속 방식 또는 IAP를 사용하고, 직접 접속이면 허용 출발지 IP를 제한한다.

## 7. 도메인 없이 확인

로컬 터미널에서 터널을 유지한다.

```bash
ssh -N -L 18080:127.0.0.1:8080 사용자명@GCP_IP
```

다른 로컬 터미널에서:

```bash
curl -f http://127.0.0.1:18080/api/v1/health
curl -f http://127.0.0.1:18080/actuator/health
```

첫 경로는 프로세스 응답, 두 번째는 DB를 포함한 상태 확인이다. 이어서 테스트 계정으로
DB를 쓰는 요청을 검증한다. 미국↔서울 지연과 메모리·스왑 사용량을 측정한다.
초기 힙 384MB·컨테이너 700MB·풀 3개는 튜닝 시작값이며 처리량 보장이 아니다.
실제 휴대폰에서 로컬 터널 주소를 그대로 사용할 수는 없다.

## 8. 업데이트·복구

로컬에서 검증 후 새 태그로 빌드·게시한다. VM에서는 먼저 `make status`로 이전 이미지
태그를 기록한 뒤 교체한다. 운영 파일이 바뀐 경우에만 4번의 파일 전달을 반복한다.

```bash
make deploy IMAGE_TAG=release-002
make status
```

실패하면 이전 앱이 현재 DB 스키마와 호환되는지 확인한 뒤:

```bash
make rollback IMAGE_TAG=release-001
```

복구도 지정 이미지 다운로드와 헬스체크를 거친다. **DB 마이그레이션은 되돌리지 않는다.**
컬럼 삭제 등 이전 버전과 호환되지 않는 변경은 별도 복구 계획이 필요하다.
한 JVM만 교체하므로 배포 중 짧은 중단이 있다. 중지하려면 `make stop`을 사용한다.

Actions는 같은 검증·이미지 타깃을 재사용한다. 자동 배포의 계정·경로·설정은
[ACTIONS.md](ACTIONS.md)를 따른다. 도메인·HTTPS 구성은 별도다.
