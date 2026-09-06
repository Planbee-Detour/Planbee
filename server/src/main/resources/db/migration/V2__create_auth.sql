-- auth 도메인 스키마. 계약: docs/features/auth/contract.yaml
--
-- 스키마의 소유자는 Flyway 다 (server.md S-14). 엔티티만 고치고 여기를 빼먹으면
-- ddl-auto=validate 가 기동을 막는다 — 누락이 조용히 지나가지 않게 하는 장치다.
--
-- 시각 컬럼은 전부 UTC 로 저장한다 (common.md C-2, hibernate.jdbc.time_zone=UTC).

-- ─────────────────────────────────────────────────────────────────────
-- 사용자
--
-- 계정 삭제는 즉시 파기다 (PRD 제약, 개인정보보호법 제21조). soft delete 컬럼을 두지 않는다 —
-- deleted_at 을 두면 "지웠다" 는 약속과 실제 저장 상태가 어긋나고, AC-32(같은 이메일 재가입)를
-- 위해 unique 제약을 부분 인덱스로 비트는 복잡도까지 따라온다.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
	id                       BIGSERIAL    PRIMARY KEY,
	-- 정규화(소문자·앞뒤 공백 제거)한 값만 저장한다. 로그인 실패 카운터의 키와 같은 형태다 (AC-47).
	email                    VARCHAR(255) NOT NULL,
	-- PasswordEncoder(위임 인코더, 기본 bcrypt) 의 출력. 평문·역산 가능한 형태를 저장하지 않는다 (S-17).
	password_hash            VARCHAR(255) NOT NULL,
	-- 선택 항목. 비어 있어도 가입 신청이 접수된다 (AC-1·AC-6, PRD 제약).
	signup_reason            VARCHAR(100),
	-- PENDING / APPROVED / REJECTED / SUSPENDED. 신규 가입은 항상 PENDING 이다.
	status                   VARCHAR(20)  NOT NULL,
	-- USER / ADMIN. 앱에서 역할을 바꾸는 경로는 만들지 않는다.
	role                     VARCHAR(20)  NOT NULL,
	-- 만 14세 이상 "자기 확인" 시각. 동의가 아니므로 동의 이력이 아니라 여기에 남긴다
	-- (2026-08-25 확정 — 대응 문서가 없어 "동의한 약관의 버전" 이 성립하지 않는다).
	age_over_14_confirmed_at TIMESTAMP(6) NOT NULL,
	created_at               TIMESTAMP(6) NOT NULL,
	updated_at               TIMESTAMP(6) NOT NULL,

	CONSTRAINT uk_users_email UNIQUE (email)
);

-- ─────────────────────────────────────────────────────────────────────
-- 동의 이력 (AC-8)
--
-- 3종(TERMS/PRIVACY/MARKETING)을 모두 남긴다. 체크하지 않은 항목도 agreed=false 로 남겨야
-- "받은 적이 없다" 와 "거부했다" 를 구분할 수 있다. 특히 MARKETING 은 정보통신망법상
-- 광고성 정보를 보낼 때 동의 여부와 시각을 증빙해야 한다.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE user_consents (
	id               BIGSERIAL    PRIMARY KEY,
	user_id          BIGINT       NOT NULL,
	consent_type     VARCHAR(20)  NOT NULL,
	agreed           BOOLEAN      NOT NULL,
	-- MARKETING 은 대응 문서가 아직 없어 비어 있다. 그래서 nullable 이다 (design.md §5.4).
	document_version VARCHAR(20),
	agreed_at        TIMESTAMP(6) NOT NULL,

	CONSTRAINT fk_user_consents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	CONSTRAINT uk_user_consents_user_type UNIQUE (user_id, consent_type)
);

CREATE INDEX idx_user_consents_user ON user_consents (user_id);

-- ─────────────────────────────────────────────────────────────────────
-- 리프레시 토큰 (AC-23·24·25·49)
--
-- 저장은 해시로만 한다. 평문을 두면 DB 가 유출됐을 때 그대로 세션이 된다.
--
-- 수명은 유휴 만료(sliding)다 — 회전할 때마다 새 14일을 받고 절대 만료 상한은 없다.
-- 그래서 expires_at 은 "이 토큰의" 만료이며, 회전하면 새 행이 새 expires_at 을 갖는다.
--
-- 재사용 감지는 rotated_at 으로 한다. 이미 회전된(rotated_at IS NOT NULL) 토큰이 다시 오면
-- 유예 창(10초) 안이면 정상 재시도, 밖이면 재사용이다 → 그 계정의 전체 폐기 (AC-24).
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
	id         BIGSERIAL    PRIMARY KEY,
	user_id    BIGINT       NOT NULL,
	-- SHA-256 hex(64자). 리프레시 토큰은 서버가 만든 난수라 bcrypt 가 아니라 해시로 충분하고,
	-- 매 요청 조회해야 하므로 인덱스가 걸리는 결정론적 해시여야 한다.
	--
	-- 길이가 고정이지만 CHAR 가 아니라 VARCHAR 를 쓴다 — Hibernate 는 String 필드를 varchar 로
	-- 매핑하고 ddl-auto=validate 가 bpchar 를 불일치로 잡는다. 여기서 타입을 맞춰 두지 않으면
	-- 애플리케이션이 아예 뜨지 않는다. 길이 제약은 VARCHAR(64) 로도 그대로 유지된다.
	token_hash VARCHAR(64)  NOT NULL,
	issued_at  TIMESTAMP(6) NOT NULL,
	expires_at TIMESTAMP(6) NOT NULL,
	-- 회전된 시각. NULL 이면 아직 살아 있는 토큰이다.
	rotated_at TIMESTAMP(6),
	-- 로그아웃(AC-26) 또는 재사용 감지로 인한 계정 전체 폐기(AC-24) 시각.
	revoked_at TIMESTAMP(6),
	-- 폐기 사유. 앱이 띄우는 배너가 갈리므로 반드시 구분해야 한다 (design.md §4.3):
	--   LOGOUT         -> AUTH_REFRESH_TOKEN_INVALID  -> "다시 로그인해 주세요" (만료 배너)
	--   REUSE_DETECTED -> AUTH_REFRESH_TOKEN_REVOKED  -> "모든 기기에서 로그아웃했어요" (보안 배너)
	revoke_reason VARCHAR(20),

	CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
	CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
