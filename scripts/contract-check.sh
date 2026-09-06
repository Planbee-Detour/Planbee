#!/usr/bin/env bash
#
# 계약(docs/api/openapi.yaml)과 서버 구현이 만들어낸 실제 스펙을 대조한다.
#
# 계약이 원본이고 구현이 따라간다. 어긋나면 계약이 아니라 구현을 고친다. (AGENTS.md 절대규칙 1)
#
# 실패 조건
#   1. 구현이 계약을 어긴 파괴적 변경 (필드 삭제, 타입 축소, 응답 제거 등)
#   2. 계약에 없는 엔드포인트를 구현이 노출 (문서화되지 않은 API = 계약 드리프트)
#
# 실패가 아닌 것
#   - 계약에만 있고 아직 구현되지 않은 것 → 진행 중일 수 있으므로 정보로만 보고
#   - servers, 설명 문구 등 환경/서술 차이
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT="$ROOT/docs/api/openapi.yaml"
IMPLEMENTED="$ROOT/server/build/openapi.json"
WORK="$ROOT/server/build/contract-check"
OASDIFF_IMAGE="tufin/oasdiff"

docker info >/dev/null 2>&1 || {
	echo "✗ Docker 데몬이 실행 중이 아닙니다. Docker Desktop 을 켠 뒤 다시 시도하세요."
	exit 1
}

[ -f "$IMPLEMENTED" ] || {
	echo "✗ $IMPLEMENTED 가 없습니다. 'make contract-export' 를 먼저 실행하세요."
	exit 1
}

mkdir -p "$WORK"

# servers 는 환경마다 다르므로 비교에서 제외한다.
python3 - "$CONTRACT" "$IMPLEMENTED" "$WORK" <<'PY'
import json, sys, pathlib, re

contract_path, implemented_path, work = sys.argv[1], sys.argv[2], sys.argv[3]

def strip_servers_yaml(text):
    # 최상위 servers 블록만 제거한다 (들여쓰기 없는 'servers:' 부터 다음 최상위 키까지).
    lines, out, skipping = text.splitlines(True), [], False
    for line in lines:
        if re.match(r'^servers:\s*$', line):
            skipping = True
            continue
        if skipping:
            if re.match(r'^\S', line):
                skipping = False
            else:
                continue
        out.append(line)
    return ''.join(out)

pathlib.Path(work, 'contract.yaml').write_text(
    strip_servers_yaml(pathlib.Path(contract_path).read_text(encoding='utf-8')), encoding='utf-8')

spec = json.loads(pathlib.Path(implemented_path).read_text(encoding='utf-8'))
spec.pop('servers', None)
pathlib.Path(work, 'implemented.json').write_text(
    json.dumps(spec, ensure_ascii=False), encoding='utf-8')
PY

REL_WORK="${WORK#"$ROOT/"}"
run_oasdiff() {
	docker run --rm -v "$ROOT":/work -w /work "$OASDIFF_IMAGE" "$@"
}

# 계약에만 있고 아직 구현되지 않은 경로를 뺀 사본을 만든다.
#
# oasdiff 는 계약에 있고 구현에 없는 경로를 api-path-removed-without-deprecation(ERR) 로 본다.
# 그건 "운영 중인 API 를 없앴다" 는 뜻이고 여기서 보려는 것과 다르다 — 이 게이트에서 계약은
# 원본이고 구현이 따라가는 쪽이라, 아직 안 따라온 경로는 실패가 아니라 정보다 (파일 상단 참조).
# 그래서 그 경로를 지운 사본으로 1단계를 검사하고, 지운 목록은 따로 출력한다.
# 구현이 계약을 어긴 진짜 파괴적 변경(필드 삭제·타입 축소·응답 제거)은 그대로 걸린다.
UNIMPLEMENTED=$(python3 - "$WORK/contract.yaml" "$IMPLEMENTED" "$WORK/contract-implemented.yaml" <<'DROP'
import json, pathlib, re, sys

contract_path, implemented_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]

implemented = set((json.loads(pathlib.Path(implemented_path).read_text(encoding='utf-8'))
                   .get('paths') or {}).keys())

lines = pathlib.Path(contract_path).read_text(encoding='utf-8').splitlines(True)
out, dropped = [], []
in_paths = False   # 최상위 paths: 블록 안인가
skipping = False   # 지금 지우는 중인 경로가 있는가

for line in lines:
    if re.match(r'^paths:\s*$', line):
        in_paths, skipping = True, False
        out.append(line)
        continue
    if in_paths and re.match(r'^\S', line):   # 다음 최상위 키 (components: 등)
        in_paths, skipping = False, False
    if in_paths:
        m = re.match(r'^  (/\S*):\s*$', line)
        if m:
            path = m.group(1)
            skipping = path not in implemented
            if skipping:
                dropped.append(path)
                continue
        elif skipping and not re.match(r'^  \S', line):
            continue          # 지우는 경로에 딸린 하위 줄
        elif skipping:
            skipping = False  # 같은 깊이의 다른 키를 만나면 끝
    out.append(line)

pathlib.Path(out_path).write_text(''.join(out), encoding='utf-8')
print('\n'.join(dropped))
DROP
)

echo "── 1. 구현이 계약을 어겼는가 (파괴적 변경) ──"
# --fail-on ERR 이 없으면 oasdiff 는 파괴적 변경을 찾아도 exit 0 을 반환한다.
# 이게 빠지면 통과만 하는 무의미한 게이트가 된다.
if ! run_oasdiff breaking "$REL_WORK/contract-implemented.yaml" "$REL_WORK/implemented.json" --fail-on ERR; then
	echo
	echo "✗ 구현이 계약을 어겼습니다. 계약이 아니라 구현을 고치세요."
	echo "  계약 변경이 정말 필요하면 tech-lead 에게 요청하세요 (defects.md)."
	exit 1
fi

echo
echo "── 2. 계약에만 있고 아직 구현되지 않은 경로 (정보) ──"
if [ -n "$UNIMPLEMENTED" ]; then
	echo "$UNIMPLEMENTED" | sed 's/^/    i /'
	echo "  진행 중일 수 있으므로 실패로 보지 않는다. 1단계 검사에서는 제외했다."
else
	echo "없음"
fi

echo
echo "── 3. 계약에 없는 엔드포인트를 노출하는가 ──"
run_oasdiff diff "$REL_WORK/contract.yaml" "$REL_WORK/implemented.json" --format json \
	>"$WORK/diff.json"

UNDOCUMENTED=$(python3 - "$WORK/diff.json" <<'PY'
import json, sys
diff = json.load(open(sys.argv[1], encoding='utf-8')) or {}
added = (diff.get('paths') or {}).get('added') or []
print('\n'.join(added))
PY
)

if [ -n "$UNDOCUMENTED" ]; then
	echo "✗ 계약에 없는 엔드포인트가 구현돼 있습니다:"
	echo "$UNDOCUMENTED" | sed 's/^/    /'
	echo "  docs/api/openapi.yaml 에 먼저 추가하세요 (tech-lead)."
	exit 1
fi
echo "없음"

echo
echo "── 4. 참고: 계약과 구현의 나머지 차이 ──"
run_oasdiff changelog "$REL_WORK/contract.yaml" "$REL_WORK/implemented.json" || true

echo
echo "✓ contract-check 통과"
