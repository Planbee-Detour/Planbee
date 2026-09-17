-- admin-user-approval E2E 시드. e2e 프로필에서만 적용된다 (application-e2e.properties).
--
-- V901 을 고치지 않고 파일을 새로 나눈 이유는 Flyway 체크섬이다 — 이미 적용된 DB 에서
-- V901 의 한 글자를 바꿔도 기동이 실패한다. 시드는 V902, V903 … 으로 이어 붙인다.
--
-- 비밀번호 해시는 V901 의 값을 그대로 쓴다 (평문 `planbee2026`, 테스트 전용 고정 자격 증명).
-- 새로 만들지 않는 이유는 두 가지다 — 손으로 만든 해시는 인코더 정책과 어긋날 수 있고,
-- 이미 저장소에 있는 테스트 값을 재사용하는 편이 관리 지점을 늘리지 않는다.

-- ─────────────────────────────────────────────────────────────────────
-- V901 이 넣은 계정의 처리 시각 보정
--
-- V901 은 admin-user-approval 이전에 쓰여 approved_at / processed_at 을 모른다.
-- 보정하지 않으면 그 계정이 처리 완료 목록에서 정렬 키가 NULL 인 행으로 나타난다
-- (계약상 processed_at 은 필수다). V901 을 고칠 수 없으므로 여기서 채운다.
-- ─────────────────────────────────────────────────────────────────────
UPDATE users
SET approved_at  = TIMESTAMP '2026-01-02 03:04:05',
    processed_at = TIMESTAMP '2026-01-02 03:04:05'
WHERE status = 'APPROVED' AND processed_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 관리자 계정 — 관리자 화면 진입과 목록·상태 전이 플로우가 쓴다.
-- 역할이 ADMIN 인 계정은 앱에서 만들 수 없으므로(auth PRD 제약) 시드로만 존재한다.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO users (
	email,
	password_hash,
	signup_reason,
	status,
	role,
	age_over_14_confirmed_at,
	created_at,
	updated_at,
	approved_at,
	processed_at
) VALUES (
	'admin@e2e.planbee.test',
	'{bcrypt}$2a$10$k4avPDjQSuFRsKqNrroSGOIdVi6QtI7I.t6P63A9kc6d9OGT9GVr6',
	'E2E 관리자 계정',
	'APPROVED',
	'ADMIN',
	TIMESTAMP '2026-01-02 03:04:05',
	TIMESTAMP '2026-01-02 03:04:05',
	TIMESTAMP '2026-01-02 03:04:05',
	TIMESTAMP '2026-01-02 03:04:05',
	TIMESTAMP '2026-01-02 03:04:05'
);

INSERT INTO user_consents (user_id, consent_type, agreed, document_version, agreed_at)
SELECT u.id, c.consent_type, c.agreed, c.document_version, TIMESTAMP '2026-01-02 03:04:05'
FROM users u
CROSS JOIN (VALUES
	('TERMS',     TRUE,  'v1.0'),
	('PRIVACY',   TRUE,  'v1.0'),
	('MARKETING', FALSE, NULL)
) AS c (consent_type, agreed, document_version)
WHERE u.email = 'admin@e2e.planbee.test';

-- ─────────────────────────────────────────────────────────────────────
-- 검토 대기 계정 2건 — 목록 정렬과 승인·거절 플로우가 쓴다.
--
-- 하나는 가입 사유가 있고 하나는 비어 있다. AC-33("입력하지 않음")과 AC-34(사유가 없어도
-- 같은 경로)가 시드 없이는 확인되지 않기 때문이다. created_at 을 서로 다르게 둬서
-- 정렬(최신순)이 관측 가능하다.
--
-- 가입 신청 플로우(auth-01)가 만드는 계정과 겹치지 않도록 이메일을 admin- 접두어로 구분한다.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO users (
	email, password_hash, signup_reason, status, role,
	age_over_14_confirmed_at, created_at, updated_at
) VALUES
(
	'admin-pending-1@e2e.planbee.test',
	'{bcrypt}$2a$10$k4avPDjQSuFRsKqNrroSGOIdVi6QtI7I.t6P63A9kc6d9OGT9GVr6',
	'여행 일정이 자주 바뀌어서 써보고 싶어요.',
	'PENDING', 'USER',
	TIMESTAMP '2026-02-01 01:00:00', TIMESTAMP '2026-02-01 01:00:00', TIMESTAMP '2026-02-01 01:00:00'
),
(
	'admin-pending-2@e2e.planbee.test',
	'{bcrypt}$2a$10$k4avPDjQSuFRsKqNrroSGOIdVi6QtI7I.t6P63A9kc6d9OGT9GVr6',
	NULL,
	'PENDING', 'USER',
	TIMESTAMP '2026-02-02 02:00:00', TIMESTAMP '2026-02-02 02:00:00', TIMESTAMP '2026-02-02 02:00:00'
);

-- ─────────────────────────────────────────────────────────────────────
-- 거절된 계정 1건 — 거절 취소(AC-19) 플로우가 쓴다.
-- 거절 사유는 저장돼 있지만 어떤 응답에도 나가지 않는다. 거절 취소가 이 값을 비운다.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO users (
	email, password_hash, signup_reason, status, role,
	age_over_14_confirmed_at, created_at, updated_at,
	rejected_at, processed_at, rejection_reason
) VALUES (
	'admin-rejected@e2e.planbee.test',
	'{bcrypt}$2a$10$k4avPDjQSuFRsKqNrroSGOIdVi6QtI7I.t6P63A9kc6d9OGT9GVr6',
	'E2E 거절 계정',
	'REJECTED', 'USER',
	TIMESTAMP '2026-01-10 00:00:00', TIMESTAMP '2026-01-10 00:00:00', TIMESTAMP '2026-01-15 00:00:00',
	TIMESTAMP '2026-01-15 00:00:00', TIMESTAMP '2026-01-15 00:00:00',
	'E2E 고정 사유'
);
