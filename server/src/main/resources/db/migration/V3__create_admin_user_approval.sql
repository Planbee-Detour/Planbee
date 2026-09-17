-- admin-user-approval 도메인 스키마. 계약: docs/features/admin-user-approval/contract.yaml
--
-- 스키마의 소유자는 Flyway 다 (server.md S-14). 시각 컬럼은 전부 UTC 다 (common.md C-2).

-- ─────────────────────────────────────────────────────────────────────
-- 상태 전이 시각과 거절 사유
--
-- users 테이블은 auth 가 만들었지만(V2) 상태를 바꾸는 것은 이 기능이다.
-- 상태별로 시각 컬럼을 따로 두는 이유는 화면이 그렇게 요구하기 때문이다 —
-- 상세 시트가 "승인 시각" 과 "정지 시각" 을 동시에 보여준다 (design.md §7.1).
--
--   approved_at   승인 또는 정지 해제 시각. REJECTED 에서는 NULL (승인된 적이 없다).
--                 정지 해제가 이 값을 갱신한다 (계약 POST /suspend/cancel).
--   suspended_at  SUSPENDED 일 때만 값이 있다. 정지 해제가 비운다.
--   rejected_at   REJECTED 일 때만 값이 있다. 거절 취소가 비운다.
--
-- processed_at 은 위 셋에서 **파생되지 않고 따로 저장한다.**
-- 목록의 정렬 키이자 커서 키인데, COALESCE 식으로 정렬하면 커서 비교와 인덱스가
-- 같은 식을 세 곳에서 되풀이하게 된다. 값이 어긋날 수 없도록 쓰는 지점을 한 곳
-- (AdminUserService 의 상태 전이)으로 모으고 컬럼으로 고정한다.
-- PENDING 은 "아직 처리되지 않음" 이므로 NULL 이다.
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN approved_at       TIMESTAMP(6);
ALTER TABLE users ADD COLUMN suspended_at      TIMESTAMP(6);
ALTER TABLE users ADD COLUMN rejected_at       TIMESTAMP(6);
ALTER TABLE users ADD COLUMN processed_at      TIMESTAMP(6);
-- 선택 입력이고 최대 200자다 (AC-16·AC-17). 저장만 하고 어떤 응답에도 싣지 않는다.
-- 거절 취소가 이 값을 비운다 — 남겨 두면 다음 거절 때 어느 결정에 붙은 사유인지 알 수 없다.
ALTER TABLE users ADD COLUMN rejection_reason  VARCHAR(200);

-- 이 마이그레이션 이전에 만들어진 행의 보정.
-- PENDING 이 아닌 계정은 어느 시점엔가 상태가 바뀐 것이고, 그 시각으로 남아 있는 값은
-- updated_at 뿐이다. 보정하지 않으면 처리 완료 목록에서 정렬 키가 NULL 인 행이 생긴다.
UPDATE users SET approved_at = updated_at,  processed_at = updated_at WHERE status = 'APPROVED';
UPDATE users SET suspended_at = updated_at, processed_at = updated_at WHERE status = 'SUSPENDED';
UPDATE users SET rejected_at = updated_at,  processed_at = updated_at WHERE status = 'REJECTED';

-- ─────────────────────────────────────────────────────────────────────
-- 목록 인덱스
--
-- 커서 페이지네이션은 (정렬 키, id) 순서로 훑으므로 인덱스도 같은 순서·같은 방향이어야
-- 정렬 없이 읽힌다. 부분 인덱스(WHERE)를 쓰는 이유는 두 목록이 서로 배타적인 집합이고,
-- 검토 대기는 처리되는 대로 줄어들어 전체 인덱스를 쓰면 대부분이 낭비되기 때문이다.
--
-- 검토 대기의 정렬 키는 requested_at = users.created_at 이다 (계약 PendingUserItem).
-- 거절 취소로 되돌아온 항목도 created_at 이 바뀌지 않아 원래 자리로 돌아간다 (design.md §7.5).
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_pending_cursor ON users (created_at DESC, id DESC) WHERE status = 'PENDING';
CREATE INDEX idx_users_processed_cursor ON users (processed_at DESC, id DESC) WHERE status <> 'PENDING';

-- ─────────────────────────────────────────────────────────────────────
-- 처리 기록 (AC-13)
--
-- "누가 언제 무엇을" 을 남긴다. **응답에는 싣지 않는다** — 화면에 그리지 않기로 확정됐고
-- (2026-09-07 Q2 / design.md §7.1.1), 그래서 계약에도 처리자 필드가 없다.
-- 남기는 이유는 화면이 아니라 사후 확인이다.
--
-- users 로의 외래키를 걸지 않는다. auth 의 계정 삭제는 즉시 파기라(auth AC-31) FK 가 있으면
-- 기록이 계정과 함께 사라지거나(CASCADE) 삭제 자체가 막힌다(RESTRICT). 기록은 계정보다
-- 오래 남아야 한다. 대신 개인정보를 담지 않는다 — 식별자와 동작뿐이고 이메일은 넣지 않는다.
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE admin_action_logs (
	id             BIGSERIAL    PRIMARY KEY,
	-- 처리한 관리자 (JWT 의 sub).
	actor_user_id  BIGINT       NOT NULL,
	-- 처리 대상. 삭제된 계정을 가리킬 수 있다 (위 참조).
	target_user_id BIGINT       NOT NULL,
	-- APPROVE / REJECT / CANCEL_REJECTION / SUSPEND / CANCEL_SUSPENSION
	action         VARCHAR(30)  NOT NULL,
	created_at     TIMESTAMP(6) NOT NULL
);

CREATE INDEX idx_admin_action_logs_target ON admin_action_logs (target_user_id, created_at DESC);
