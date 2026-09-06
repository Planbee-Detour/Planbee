/**
 * docs/legal/*.md 를 앱 번들에 포함할 TypeScript 모듈로 옮긴다.
 *
 * AC-37 은 "네트워크가 끊긴 상태에서도 약관 전문이 정상 표시된다" 를 요구한다.
 * 즉 본문이 앱 안에 있어야 한다. 그렇다고 md 를 손으로 복사하면 원본과 사본이 갈라지고,
 * 그 순간 화면에 뜨는 약관과 실제로 동의를 받은 약관이 달라진다.
 *
 * 그래서 복사를 사람이 아니라 이 스크립트가 한다. 원본은 언제나 docs/legal/ 이고
 * 생성물은 커밋하지 않는다 (.gitignore).
 *
 * 실행: `make legal-bundle` (verify-mobile 이 먼저 호출한다)
 */
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '../..');
const OUTPUT = resolve(REPO_ROOT, 'mobile/src/features/auth/legal/documents.generated.ts');

/** design.md §6.1 의 문서 종류. 파라미터로 쓰는 키와 화면 타이틀이 여기서 정해진다. */
const DOCUMENTS = [
  {key: 'terms', title: '이용약관', source: 'docs/legal/terms.md'},
  {key: 'privacy', title: '개인정보 처리방침', source: 'docs/legal/privacy-policy.md'},
];

/**
 * 머리말에서 버전과 시행일을 뽑는다.
 * 이 값이 화면 표시(AC-36)와 동의 이력 저장(AC-8)에 같은 출처로 쓰인다.
 */
function readMetadata(text) {
  const version = /^-\s*버전:\s*`([^`]+)`/m.exec(text)?.[1];
  const effectiveDate = /^-\s*시행일:\s*`([^`]+)`/m.exec(text)?.[1];
  if (!version) {
    throw new Error('버전 머리말을 찾지 못했습니다. `- 버전: `vX.Y`` 형식이어야 합니다.');
  }
  return {version, effectiveDate: effectiveDate ?? null};
}

/**
 * 머리말과 인용 블록을 잘라내고 본문만 남긴다.
 * design.md §6.6 이 "문서 상단의 버전/시행일/상태 머리말과 인용 블록은 렌더하지 않는다" 고
 * 정했고, 그 자리는 §6.4 의 버전 칩이 대신한다.
 */
function readBody(text) {
  const separator = text.indexOf('\n---\n');
  if (separator < 0) {
    throw new Error('머리말과 본문을 나누는 `---` 구분선을 찾지 못했습니다.');
  }
  return text.slice(separator + '\n---\n'.length).trim();
}

/** 템플릿 리터럴로 내보내므로 백틱·역슬래시·${ 를 이스케이프한다. */
function toTemplateLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

const entries = DOCUMENTS.map(document => {
  const text = readFileSync(resolve(REPO_ROOT, document.source), 'utf8');
  const {version, effectiveDate} = readMetadata(text);
  return {...document, version, effectiveDate, body: readBody(text)};
});

const generated = `/**
 * 생성물이다. 손으로 고치지 마세요 — 다음 \`make legal-bundle\` 에서 덮어써집니다.
 * 원본: ${DOCUMENTS.map(d => d.source).join(', ')}
 * 생성기: mobile/scripts/bundle-legal.mjs
 */

export type LegalDocumentKey = ${entries.map(e => `'${e.key}'`).join(' | ')};

export type LegalDocument = {
  key: LegalDocumentKey;
  /** 화면 타이틀 (design.md §6.3) */
  title: string;
  /** AC-8 의 동의 이력과 AC-36 의 화면 표시가 공유하는 값 */
  version: string;
  /** 미확정이면 \`{{시행일}}\` 그대로 들어온다 — 화면은 "시행일 준비 중" 으로 바꾼다 (§6.4) */
  effectiveDate: string | null;
  /** 머리말을 제외한 본문 마크다운 (§6.6) */
  body: string;
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
${entries
  .map(
    entry => `  ${entry.key}: {
    key: '${entry.key}',
    title: '${entry.title}',
    version: '${entry.version}',
    effectiveDate: ${entry.effectiveDate === null ? 'null' : `'${entry.effectiveDate}'`},
    body: \`${toTemplateLiteral(entry.body)}\`,
  },`,
  )
  .join('\n')}
};
`;

mkdirSync(dirname(OUTPUT), {recursive: true});
writeFileSync(OUTPUT, generated, 'utf8');
console.log(`→ ${OUTPUT.replace(`${REPO_ROOT}/`, '')} (${entries.map(e => `${e.key} ${e.version}`).join(', ')})`);
