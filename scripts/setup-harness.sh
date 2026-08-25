#!/usr/bin/env bash
#
# 각 에이전트 CLI 가 읽는 파일을 **로컬에** 생성한다.
#
# git 에 올라가는 것은 벤더 중립 원본뿐이다.
#   AGENTS.md, .agents/, scripts/
#
# 이 스크립트가 만드는 것은 전부 .gitignore 대상이다.
#   CLAUDE.md, GEMINI.md   -> AGENTS.md 심볼릭 링크
#   .claude/               -> 역할 어댑터, 슬래시 커맨드, 권한 설정
#   .gemini/               -> 커스텀 커맨드
#
# 언제든 지우고 다시 만들어도 된다.  make harness
#
# --codex 를 주면 ~/.codex/prompts/ 에도 생성한다 (make harness-codex).
# Codex CLI 는 커스텀 프롬프트를 **전역 디렉토리에서만** 읽으므로 저장소 안에 둘 수 없다.
# 프로젝트 밖에 파일을 만들기 때문에 기본 동작에서는 제외하고 별도 타깃으로 분리했다.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT
cd "$ROOT"

echo "── 단일 원본 지침 링크 ──"
ln -sfn AGENTS.md CLAUDE.md
ln -sfn AGENTS.md GEMINI.md
echo "  CLAUDE.md -> AGENTS.md"
echo "  GEMINI.md -> AGENTS.md"

echo "── 역할 어댑터 생성 ──"
python3 <<'PY'
import json, os, pathlib

root = pathlib.Path(os.environ['ROOT'])
manifest = json.loads((root / '.agents' / 'manifest.json').read_text(encoding='utf-8'))

DOC_TOOLS = 'Read, Write, Edit, Grep, Glob'
CODE_TOOLS = 'Read, Write, Edit, Bash, Grep, Glob'

claude_agents = root / '.claude' / 'agents'
gemini_commands = root / '.gemini' / 'commands'
claude_agents.mkdir(parents=True, exist_ok=True)
gemini_commands.mkdir(parents=True, exist_ok=True)

body = (
    "`.agents/roles/{name}.md` 를 읽고 그 역할 정의를 그대로 따르세요.\n"
    "프로젝트 공통 규칙은 `AGENTS.md` 에 있습니다.\n\n"
    "이 파일은 자동 생성된 어댑터입니다. 직접 수정하지 마세요 —\n"
    "`make harness` 를 다시 실행하면 덮어써집니다. 역할 내용은 `.agents/roles/` 에서 고칩니다.\n"
)

for role in manifest['roles']:
    name = role['name']
    tools = CODE_TOOLS if role['needsShell'] else DOC_TOOLS
    if role.get('mcpTools'):
        tools += ', ' + ', '.join(role['mcpTools'])

    (claude_agents / f'{name}.md').write_text(
        f"---\nname: {name}\ndescription: {role['description']}\ntools: {tools}\n---\n\n"
        + body.format(name=name),
        encoding='utf-8')

    (gemini_commands / f'{name}.toml').write_text(
        f'description = "{role["description"]}"\n'
        'prompt = """\n'
        + body.format(name=name)
        + '\n이번 작업: {{args}}\n"""\n',
        encoding='utf-8')

print(f"  .claude/agents/    {len(manifest['roles'])}개")
print(f"  .gemini/commands/  {len(manifest['roles'])}개")

# ── 슬래시 커맨드 (벤더 중립 원본에서 인자 표기만 치환) ──
source = (root / '.agents' / 'commands' / 'feature.md').read_text(encoding='utf-8')

claude_commands = root / '.claude' / 'commands'
claude_commands.mkdir(parents=True, exist_ok=True)
(claude_commands / 'feature.md').write_text(
    "---\n"
    "description: 기능 하나를 파이프라인 전체로 진행한다 (PRD -> 계약 -> 구현 -> 리뷰 -> 테스트 -> 통합)\n"
    "argument-hint: <기능 설명> 또는 <기능 슬러그>\n"
    "---\n\n"
    + source.replace('{{ARGS}}', '$ARGUMENTS'),
    encoding='utf-8')

(gemini_commands / 'feature.toml').write_text(
    'description = "기능 하나를 파이프라인 전체로 진행한다"\n'
    'prompt = """\n'
    + source.replace('{{ARGS}}', '{{args}}')
    + '"""\n',
    encoding='utf-8')

print("  슬래시 커맨드      feature")
PY

echo "── Claude Code 권한 설정 ──"
# deny 목록 주의: `.env.*` 같은 넓은 패턴을 쓰면 `.env.example` 까지 막힌다.
# AGENTS.md 절대 규칙 7 은 에이전트에게 "`.env.example` 만 참조" 하라고 지시하므로
# 그 파일은 반드시 읽을 수 있어야 한다. 실제 시크릿이 들어가는 변형만 열거한다.
mkdir -p .claude
cat > .claude/settings.json <<'JSON'
{
  "permissions": {
    "allow": [
      "Bash(make:*)",
      "Bash(npm run:*)",
      "Bash(npm test:*)",
      "Bash(npx openapi-typescript:*)",
      "Bash(./server/gradlew:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git show:*)",
      "Bash(./scripts/agent.sh:*)",
      "mcp__pencil__get_app_state",
      "mcp__pencil__read_skill",
      "mcp__pencil__get_style",
      "mcp__pencil__execute"
    ],
    "deny": [
      "Read(./**/*.pen)",
      "Read(./.env)",
      "Read(./.env.local)",
      "Read(./.env.*.local)",
      "Read(./.env.development*)",
      "Read(./.env.production*)",
      "Read(./.env.test*)",
      "Read(./**/*.keystore)",
      "Read(./**/*.p12)"
    ]
  }
}
JSON
echo "  .claude/settings.json"

if [ "${1:-}" = "--codex" ]; then
	CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
	echo "── Codex 전역 프롬프트 생성 ──"
	echo "  대상: $CODEX_HOME/prompts  (저장소 밖)"
	CODEX_HOME="$CODEX_HOME" python3 <<'PY'
import json, os, pathlib

root = pathlib.Path(os.environ['ROOT'])
prompts = pathlib.Path(os.environ['CODEX_HOME']) / 'prompts'
prompts.mkdir(parents=True, exist_ok=True)

manifest = json.loads((root / '.agents' / 'manifest.json').read_text(encoding='utf-8'))

# 전역 디렉토리라 다른 프로젝트와 섞인다. 접두어로 구분하고, 경로를 절대경로로 박는다.
for role in manifest['roles']:
    name = role['name']
    (prompts / f'planbee-{name}.md').write_text(
        f"# {role['description']}\n\n"
        f"프로젝트 루트: {root}\n\n"
        f"`{root}/AGENTS.md` 와 `{root}/.agents/roles/{name}.md` 를 읽고\n"
        f"그 역할 정의를 그대로 따르세요.\n\n"
        "이번 작업: $ARGUMENTS\n",
        encoding='utf-8')

print(f"  planbee-*.md  {len(manifest['roles'])}개  → /planbee-<역할> 로 호출")
PY
	echo
	echo "  참고: Codex 의 승인·샌드박스 정책은 ~/.codex/config.toml 에만 둘 수 있습니다."
	echo "        프로젝트 단위 권한 설정은 지원되지 않으므로 직접 설정하세요."
fi

echo
echo "✓ 하네스 로컬 파일 생성 완료 (모두 .gitignore 대상)"
echo "  Codex CLI 는 AGENTS.md 를 직접 읽으므로 지침 파일은 따로 필요 없습니다."
if [ "${1:-}" != "--codex" ]; then
	echo "  Codex 슬래시 커맨드가 필요하면: make harness-codex"
fi
