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
  --command='test -w /opt/planbee/deploy && test -f /opt/planbee/deploy/.env && test -r /opt/planbee/deploy/certs/supabase.crt'
gcloud compute scp "${connection[@]}" \
  Makefile manage.sh compose.yml .env.example README.md ACTIONS.md remote-deploy.sh test_manage.py \
  "$GCP_INSTANCE:/opt/planbee/deploy/"
gcloud compute ssh "$GCP_INSTANCE" "${connection[@]}" \
  --command="cd /opt/planbee/deploy && make deploy IMAGE_TAG=$IMAGE_TAG && make status"
