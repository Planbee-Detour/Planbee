-- auth 도메인 E2E 시드. e2e 프로필에서만 적용된다 (application-e2e.properties).
--
-- V900 을 고치지 않고 파일을 새로 나눈 이유: 이미 적용된 DB 에서 V900 의 내용을 바꾸면
-- Flyway 체크섬이 어긋나 기동이 실패한다. 주석 한 줄을 고쳐도 마찬가지다.
-- 시드는 도메인이 늘 때마다 V902, V903 … 으로 이어 붙인다.
--
-- 규칙 (e2e/README.md)
-- 1. 결정론적이어야 한다. now() 나 랜덤 값을 쓰지 않는다 — 매 실행 같은 상태여야 한다.
-- 2. 비밀번호는 반드시 해시로 넣는다 (server.md S-17).
-- 3. 여기 있는 계정은 e2e/flows/*.yaml 이 그대로 참조한다. 바꾸면 플로우도 함께 고친다.
--
-- 비밀번호 해시에 대해
--   아래 해시는 실제로 기동한 서버의 `POST /api/v1/auth/signup` 이 만들어 낸 값을
--   그대로 옮긴 것이다 (2026-08-27). 손으로 만든 값이 아니므로 SecurityConfig 의
--   DelegatingPasswordEncoder(기본 bcrypt) 와 접두사·강도까지 일치한다.
--   평문은 `planbee2026` 이고 **테스트 전용 고정 자격 증명**이다 — 이 계정은 e2e 컨테이너
--   안에만 존재하고(`make e2e-down` 이 볼륨째 지운다) 운영 DB 에는 적용되지 않는다.
--   인코더 정책이 바뀌면 이 해시는 더 이상 검증되지 않는다. 그때는 같은 방법으로 다시 뽑는다.

-- ─────────────────────────────────────────────────────────────────────
-- 승인 완료 계정 — 로그인 해피패스와 인증 지속 플로우가 쓴다.
--   e2e/flows/auth-02-login.yaml
--   e2e/flows/auth-03-session-persistence.yaml
--
-- 대기(PENDING) 계정은 시드에 두지 않는다. 가입 신청 플로우가 매 실행 새 이메일로
-- 직접 만들기 때문이다 (auth-01-signup-pending.yaml) — 같은 상태를 두 곳에서 관리하지 않는다.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO users (
	email,
	password_hash,
	signup_reason,
	status,
	role,
	age_over_14_confirmed_at,
	created_at,
	updated_at
) VALUES (
	'approved@e2e.planbee.test',
	'{bcrypt}$2a$10$k4avPDjQSuFRsKqNrroSGOIdVi6QtI7I.t6P63A9kc6d9OGT9GVr6',
	'E2E 승인 완료 계정',
	'APPROVED',
	'USER',
	TIMESTAMP '2026-01-02 03:04:05',
	TIMESTAMP '2026-01-02 03:04:05',
	TIMESTAMP '2026-01-02 03:04:05'
);

-- 동의 이력 3종 (AC-8). 가입 신청을 거쳐 승인된 계정이므로 이력이 있어야 자연스럽다.
-- MARKETING 은 거부 이력이고 대응 문서가 없어 version 이 NULL 이다 (계약 ConsentInput.version).
INSERT INTO user_consents (user_id, consent_type, agreed, document_version, agreed_at)
SELECT u.id, c.consent_type, c.agreed, c.document_version, TIMESTAMP '2026-01-02 03:04:05'
FROM users u
CROSS JOIN (VALUES
	('TERMS',     TRUE,  'v1.0'),
	('PRIVACY',   TRUE,  'v1.0'),
	('MARKETING', FALSE, NULL)
) AS c (consent_type, agreed, document_version)
WHERE u.email = 'approved@e2e.planbee.test';
