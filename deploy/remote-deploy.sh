#!/usr/bin/env bash
set -euo pipefail
cd "${DEPLOY_DIR:?}"
: "${GCP_PROJECT_ID:?GCP_PROJECT_ID가 필요합니다}"
: "${GCP_INSTANCE:?GCP_INSTANCE가 필요합니다}"
: "${GCP_ZONE:?GCP_ZONE이 필요합니다}"
# 원격 셸에 들어가는 유일한 가변 값은 검증한 커밋 SHA다.
[[ ${IMAGE_TAG:-} =~ ^[0-9a-f]{40}$ ]] || { echo 'IMAGE_TAG에는 전체 커밋 SHA가 필요합니다.' >&2; exit 1; }
connection=(--project="$GCP_PROJECT_ID" --zone="$GCP_ZONE" --tunnel-through-iap --quiet)
# /opt는 웹 SSH 사용자와 서비스 계정의 서로 다른 홈 디렉터리를 피하기 위한 고정 경로다.
# .env·인증서·GHCR 읽기 인증은 운영자가 미리 이 배포 계정에 준비한다.
gcloud compute ssh "$GCP_INSTANCE" "${connection[@]}" \
  --command='set -eu
echo "배포 접속 계정: $(id -un) (UID $(id -u))"
failed=0
if [ ! -d /opt/planbee/deploy ]; then
  echo "오류: /opt/planbee/deploy 디렉터리가 없습니다. 운영자가 먼저 준비해야 합니다." >&2
  failed=1
elif [ ! -w /opt/planbee/deploy ] || [ ! -x /opt/planbee/deploy ]; then
  echo "오류: 현재 배포 계정에 /opt/planbee/deploy 쓰기·접근 권한이 없습니다." >&2
  failed=1
fi
if [ ! -f /opt/planbee/deploy/.env ] || [ ! -r /opt/planbee/deploy/.env ]; then
  echo "오류: /opt/planbee/deploy/.env 파일이 없거나 배포 계정이 읽을 수 없습니다. VM에서 운영 환경 파일을 준비하세요." >&2
  failed=1
fi
if [ ! -f /opt/planbee/deploy/certs/supabase.crt ] || [ ! -r /opt/planbee/deploy/certs/supabase.crt ]; then
  echo "오류: /opt/planbee/deploy/certs/supabase.crt 인증서가 없거나 배포 계정이 읽을 수 없습니다." >&2
  failed=1
fi
if ! command -v make >/dev/null 2>&1; then
  echo "오류: VM에 make가 설치되어 있지 않습니다." >&2
  failed=1
fi
if ! docker info >/dev/null 2>&1; then
  echo "오류: 배포 계정이 Docker를 사용할 수 없습니다. 설치·데몬 상태·사용자 권한을 확인하세요." >&2
  failed=1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "오류: Docker Compose 플러그인이 필요합니다 (2.30 이상)." >&2
  failed=1
fi
[ "$failed" -eq 0 ] || exit 1
echo "원격 사전 점검 통과"'
gcloud compute scp "${connection[@]}" \
  Makefile manage.sh compose.yml .env.example README.md ACTIONS.md remote-deploy.sh test_manage.py \
  "$GCP_INSTANCE:/opt/planbee/deploy/"
gcloud compute ssh "$GCP_INSTANCE" "${connection[@]}" \
  --command="cd /opt/planbee/deploy && make deploy IMAGE_TAG=$IMAGE_TAG && make status"
