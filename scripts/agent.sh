#!/usr/bin/env bash
#
# 역할 기반 에이전트 디스패처 — Claude Code / Codex CLI / Gemini CLI 공용
#
#   ./scripts/agent.sh <role> "<작업 지시>"
#   AGENT_CLI=codex ./scripts/agent.sh server-reviewer "schedule 기능 리뷰"
#
# 역할 정의는 .agents/roles/<role>.md 하나뿐이며, 어떤 CLI로 실행하든 동일합니다.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROLES_DIR="$ROOT/.agents/roles"

usage() {
  echo "사용법: $0 <role> \"<작업 지시>\""
  echo
  echo "사용 가능한 역할:"
  for f in "$ROLES_DIR"/*.md; do
    [ -e "$f" ] || continue
    echo "  - $(basename "$f" .md)"
  done
  echo
  echo "CLI 선택: AGENT_CLI=claude|codex|gemini  (기본: claude)"
  exit 1
}

[ $# -ge 2 ] || usage

ROLE="$1"; shift
ROLE_FILE="$ROLES_DIR/$ROLE.md"

if [ ! -f "$ROLE_FILE" ]; then
  echo "알 수 없는 역할: $ROLE" >&2
  usage
fi

PROMPT="$(cat "$ROOT/AGENTS.md")

────────────────────────────────────────
$(cat "$ROLE_FILE")

────────────────────────────────────────
## 이번 작업
$*"

case "${AGENT_CLI:-claude}" in
  claude)
    command -v claude >/dev/null || { echo "claude CLI 미설치" >&2; exit 127; }
    claude -p "$PROMPT"
    ;;
  codex)
    # Codex CLI 는 AGENTS.md 를 자동으로 읽으므로 중복이지만, 무해하고 이식성이 우선입니다.
    command -v codex >/dev/null || { echo "codex CLI 미설치" >&2; exit 127; }
    codex exec "$PROMPT"
    ;;
  gemini)
    command -v gemini >/dev/null || { echo "gemini CLI 미설치" >&2; exit 127; }
    gemini -p "$PROMPT"
    ;;
  *)
    echo "알 수 없는 AGENT_CLI: ${AGENT_CLI}" >&2
    exit 1
    ;;
esac
