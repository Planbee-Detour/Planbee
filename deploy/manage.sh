#!/usr/bin/env bash
set -euo pipefail
cd "${DEPLOY_DIR:?DEPLOY_DIR이 필요합니다}"
action=${1:?명령이 필요합니다}
fail() { echo "오류: $*" >&2; exit 1; }
export COMPOSE_DISABLE_ENV_FILE=1
export PLANBEE_RUNTIME_ENV=.env
# Compose 변수 치환은 빈 파일을 사용한다. 운영 .env는 컨테이너 env_file로만 읽는다.
compose() { docker compose --env-file /dev/null -p planbee-production -f compose.yml "$@"; }
tagged_image() {
  [[ ${IMAGE_TAG:-} =~ ^[a-zA-Z0-9_][a-zA-Z0-9_.-]{0,127}$ ]] || fail 'IMAGE_TAG에 명시적인 릴리스 태그를 지정하세요.'
  [[ $IMAGE_TAG != latest ]] || fail 'latest 대신 버전별 태그를 사용하세요.'
  export PLANBEE_IMAGE="${IMAGE_REPOSITORY:?IMAGE_REPOSITORY가 필요합니다}:$IMAGE_TAG"
}
case "$action" in
  env)
    if [[ -e .env ]]; then
      echo '기존 운영 .env를 보존합니다.'
    else
      (umask 077; set -o noclobber; cat .env.example > .env)
      echo '운영 .env를 생성했습니다. DB 연결·JWT 값은 직접 입력하세요.'
    fi
    mkdir -p certs
    ;;
  ghcr-login)
    [[ -n ${GHCR_USER:-} ]] || fail 'GHCR_USER에 GitHub 사용자명을 지정하세요.'
    docker login ghcr.io --username "$GHCR_USER"
    ;;
  image-build)
    tagged_image
    [[ -f ../server/Dockerfile ]] || fail '이미지 빌드는 전체 저장소가 있는 로컬/CI에서 실행하세요.'
    docker buildx build --platform linux/amd64 --load \
      --label org.opencontainers.image.source=https://github.com/Planbee-Detour/Planbee \
      --tag "$PLANBEE_IMAGE" ../server
    ;;
  image-push)
    tagged_image
    docker push "$PLANBEE_IMAGE"
    ;;
  deploy)
    tagged_image
    [[ -f .env ]] || fail '먼저 make env 실행 후 운영 환경 값을 입력하세요.'
    compose config --quiet
    # 다운로드 실패 시 실행 중인 컨테이너에 손대지 않는다.
    compose pull api
    if ! compose up -d --no-build --pull never --wait --wait-timeout 300 api; then
      echo '배포 실패: make logs로 확인하고, DB 호환성을 확인한 이전 태그로 make rollback을 실행하세요.' >&2
      exit 1
    fi
    echo "배포 완료: $PLANBEE_IMAGE"
    ;;
  status|logs|stop|check)
    # 상태 조회에는 배포 태그가 불필요하다. 실행 중인 컨테이너의 설정은 바꾸지 않는다.
    export PLANBEE_IMAGE="${IMAGE_REPOSITORY:?}:inspection-only"
    case "$action" in
      status) compose ps; compose images ;;
      logs) compose logs --tail=100 -f api ;;
      stop) compose stop api ;;
      check)
        # --env-file은 Compose 변수 치환만 제어한다. 서비스 env_file도 별도로 분리한다.
        export PLANBEE_RUNTIME_ENV=/dev/null
        compose config --quiet
        ;;
    esac
    ;;
  *) fail "알 수 없는 명령: $action" ;;
esac
