.DEFAULT_GOAL := help
SHELL := /bin/bash
# 루트 Makefile과 달리 시크릿 파일을 include/source 하지 않는다.
DEPLOY_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
IMAGE_REPOSITORY ?= ghcr.io/planbee-detour/planbee-api
IMAGE_TAG ?=
GHCR_USER ?=
export DEPLOY_DIR IMAGE_REPOSITORY IMAGE_TAG GHCR_USER
export GCP_PROJECT_ID GCP_INSTANCE GCP_ZONE

.PHONY: remote-deploy
remote-deploy: ## CI에서 IAP로 설정 파일 전달 후 VM 배포 (GCP 인증 필요)
	@bash '$(DEPLOY_DIR)/remote-deploy.sh'

.PHONY: help env ghcr-login image-build image-push deploy rollback status logs stop check verify
help: ## 운영 명령 안내
	@echo '사용: make -f deploy/Makefile <타깃> (또는 deploy 디렉터리에서 make <타깃>)'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-z-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' '$(DEPLOY_DIR)/Makefile'

env: ## 빈 운영 환경 파일 생성 (기존 파일 보존)
	@bash '$(DEPLOY_DIR)/manage.sh' env
ghcr-login: ## GHCR 로그인 (GHCR_USER 지정, 비밀번호 프롬프트에 PAT 입력)
	@bash '$(DEPLOY_DIR)/manage.sh' ghcr-login
image-build: ## 로컬/CI에서 linux/amd64 이미지 빌드 (IMAGE_TAG 필수)
	@bash '$(DEPLOY_DIR)/manage.sh' image-build
image-push: ## 이미 빌드된 이미지를 GHCR에 게시 (IMAGE_TAG 필수)
	@bash '$(DEPLOY_DIR)/manage.sh' image-push
deploy: ## VM에서 다운로드 후 교체, DB 포함 헬스체크 대기 (IMAGE_TAG 필수)
	@bash '$(DEPLOY_DIR)/manage.sh' deploy
rollback: ## 지정한 이전 이미지로 복구 (IMAGE_TAG 필수, DB는 되돌리지 않음)
	@bash '$(DEPLOY_DIR)/manage.sh' deploy
status: ## 컨테이너 상태와 실행 이미지 확인
	@bash '$(DEPLOY_DIR)/manage.sh' status
logs: ## 운영 API 로그 최근 100줄과 후속 출력
	@bash '$(DEPLOY_DIR)/manage.sh' logs
stop: ## 운영 API 중지 (데이터·이미지 보존)
	@bash '$(DEPLOY_DIR)/manage.sh' stop
check: ## 운영 Compose 구조 검사 (시크릿 파일을 읽지 않음)
	@bash '$(DEPLOY_DIR)/manage.sh' check
verify: check ## 배포 스크립트 구문·실패 경로 검증 (원격 접속·실제 배포 없음)
	@bash -n '$(DEPLOY_DIR)/manage.sh'
	@bash -n '$(DEPLOY_DIR)/remote-deploy.sh'
	@python3 '$(DEPLOY_DIR)/test_manage.py'
