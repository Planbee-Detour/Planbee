.DEFAULT_GOAL := help
SHELL := /bin/bash
GRADLE := ./server/gradlew -p server

# 실제 환경 변수는 .env 에서 읽는다. .env 는 커밋하지 않는다 (.env.example 참조).
# 여기서 정의된 이름만 하위 명령(gradle, docker compose)으로 전달한다.
ifneq (,$(wildcard .env))
include .env
export $(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env)
endif

# 호스트 포트가 이미 사용 중이면 .env 에서 바꾸거나 API_PORT=18080 make ... 로 덮어쓴다.
API_PORT ?= 8080
DB_PORT ?= 5432
export API_PORT DB_PORT
API_URL := http://localhost:$(API_PORT)

define REQUIRE_ENV
	@[ -f .env ] || { \
		echo "✗ .env 가 없습니다. 'make env' 로 만든 뒤 값을 채우세요."; \
		exit 1; }
endef

# 미구성 게이트는 조용히 통과시키지 않고 명시적으로 실패시킨다.
define TODO
	@echo "✗ '$@' 는 아직 구성되지 않았습니다."; \
	echo "  $(1)"; \
	exit 1
endef

define REQUIRE_DOCKER
	@docker info >/dev/null 2>&1 || { \
		echo "✗ Docker 데몬이 실행 중이 아닙니다. Docker Desktop 을 켠 뒤 다시 시도하세요."; \
		exit 1; }
endef

.PHONY: help
help: ## 사용 가능한 타깃 목록
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ── 환경 변수 ────────────────────────────────────────────────────────
.PHONY: env
env: ## .env 생성 (.env.example 복사 — 기존 파일은 덮어쓰지 않음)
	@for pair in ".env.example:.env" "mobile/.env.example:mobile/.env"; do \
		src="$${pair%%:*}"; dst="$${pair##*:}"; \
		if [ -f "$$dst" ]; then \
			echo "· $$dst — 이미 있어 건너뜁니다"; \
		else \
			cp "$$src" "$$dst"; echo "✓ $$dst 생성"; \
		fi; \
	done
	@echo
	@echo "실제 값을 채운 뒤 사용하세요. .env 는 git 에 커밋되지 않습니다."
	@echo "운영 키 생성: openssl rand -base64 48"

# ── 하네스 ───────────────────────────────────────────────────────────
.PHONY: harness
harness: ## 에이전트 CLI 로컬 파일 생성 (CLAUDE.md, .claude/, .gemini/ — 모두 git 제외)
	./scripts/setup-harness.sh

.PHONY: harness-codex
harness-codex: ## 위 + Codex 전역 프롬프트 (~/.codex/prompts — 저장소 밖에 생성)
	./scripts/setup-harness.sh --codex

# ── 설치 ─────────────────────────────────────────────────────────────
.PHONY: install
install: env harness ## 의존성 설치 (mobile npm + CocoaPods)
	npm run mobile:install
	cd mobile && bundle install && cd ios && bundle exec pod install

# ── 로컬 DB ──────────────────────────────────────────────────────────
.PHONY: db-up db-down db-reset
db-up: ## 로컬 PostgreSQL 기동
	$(REQUIRE_ENV)
	$(REQUIRE_DOCKER)
	docker compose up -d db
	@echo "postgresql://planbee:planbee@localhost:$(DB_PORT)/planbee"

db-down: ## 로컬 PostgreSQL 정지 (데이터 유지)
	docker compose down

db-reset: ## 로컬 PostgreSQL 정지 + 데이터 삭제
	docker compose down -v

# ── 모바일 ───────────────────────────────────────────────────────────
.PHONY: lint-mobile typecheck-mobile test-mobile verify-mobile
lint-mobile: ## 모바일 린트
	npm run mobile:lint

typecheck-mobile: ## 모바일 타입 검사 (ESLint 는 타입을 보지 않는다)
	npm run mobile:typecheck

test-mobile: ## 모바일 단위/컴포넌트 테스트 (API는 msw 목킹)
	npm run mobile:test

verify-mobile: lint-mobile typecheck-mobile test-mobile ## 모바일 전체 게이트

# ── 서버 ─────────────────────────────────────────────────────────────
.PHONY: lint-server format-server test-server test-server-db verify-server
lint-server: ## 서버 정적 검사 (Spotless)
	$(GRADLE) spotlessCheck

format-server: ## 서버 코드 자동 정리
	$(GRADLE) spotlessApply

test-server: ## 서버 테스트 — Docker 불필요 (슬라이스 + ArchUnit)
	$(GRADLE) test

test-server-db: ## 서버 통합 테스트 — 실제 PostgreSQL 사용 (Docker 필요)
	$(REQUIRE_DOCKER)
	$(GRADLE) integrationTest

verify-server: lint-server test-server test-server-db ## 서버 전체 게이트

# ── 계약 (OpenAPI) ───────────────────────────────────────────────────
.PHONY: contract-export contract-check contract-types
contract-export: ## 실행 중인 서버에서 실제 OpenAPI 스펙 추출 -> server/build/openapi.json
	$(REQUIRE_DOCKER)
	$(GRADLE) integrationTest --tests '*OpenApiExportTest*'
	@echo "→ server/build/openapi.json"

contract-check: contract-export ## 계약(docs/api)과 서버 구현의 일치 여부 검증
	./scripts/contract-check.sh

contract-types: ## 계약에서 모바일 TypeScript 타입 생성
	./mobile/node_modules/.bin/openapi-typescript docs/api/openapi.yaml -o mobile/src/shared/api/schema.ts
	@echo "→ mobile/src/shared/api/schema.ts"

# ── 통합(E2E) ────────────────────────────────────────────────────────
.PHONY: e2e-up e2e-down e2e-app test-e2e logs
e2e-up: ## 통합 테스트 환경 기동 (DB + API + 시드)
	$(REQUIRE_ENV)
	$(REQUIRE_DOCKER)
	docker compose up -d --build db api
	@echo "API 기동 대기 중..."
	@for i in $$(seq 1 60); do \
		if curl -fsS $(API_URL)/api/v1/health >/dev/null 2>&1; then \
			echo "✓ API 준비됨 — $(API_URL)"; exit 0; \
		fi; sleep 2; \
	done; \
	echo "✗ API 가 기동되지 않았습니다. 'make logs' 로 원인을 확인하세요."; exit 1

e2e-down: ## 통합 테스트 환경 정리 (데이터까지 삭제 — 다음 실행의 결정론성 보장)
	docker compose down -v

e2e-app: ## 시뮬레이터에 앱 빌드/설치 (test-e2e 전에 한 번)
	npm run mobile:ios

test-e2e: ## 실제 앱 <-> 실제 서버 연동 테스트 (목킹 없음)
	@command -v maestro >/dev/null 2>&1 || { \
		echo "✗ Maestro 가 설치돼 있지 않습니다."; \
		echo "  설치: curl -Ls https://get.maestro.mobile.dev | bash"; \
		exit 1; }
	@curl -fsS $(API_URL)/api/v1/health >/dev/null 2>&1 || { \
		echo "✗ API 가 응답하지 않습니다. 먼저 'make e2e-up' 을 실행하세요."; exit 1; }
	maestro test e2e/flows

logs: ## 통합 환경 로그 (테스트 실패 원인 확인용)
	docker compose logs -f --tail=200

# ── 전체 ─────────────────────────────────────────────────────────────
.PHONY: verify
verify: verify-mobile verify-server contract-check ## 현재 구성된 모든 게이트 실행
	@echo "✓ verify 통과"
	@echo "  참고: test-e2e 는 별도 실행 (Docker + 시뮬레이터 + Maestro 필요)"
