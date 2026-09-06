/**
 * auth 기능이 다루는 타입.
 *
 * <b>API 경계 타입은 생성물(`shared/api/schema.ts`)에서 가져온다</b> (M-8 / M-17).
 * 여기에 손으로 다시 정의하지 않는다 — 계약과 어긋나는 순간 조용히 깨진다.
 * 필드 이름은 서버가 준 `snake_case` 를 그대로 쓴다.
 */
import type {components} from '../../shared/api/schema';

export type AccountStatusView = components['schemas']['AccountStatusView'];
export type AccountStatus = AccountStatusView['status'];
export type TokenPair = components['schemas']['TokenPair'];
export type UserSummary = components['schemas']['UserSummary'];
export type ConsentInput = components['schemas']['ConsentInput'];
export type SignupRequest = components['schemas']['SignupRequest'];

/**
 * 로그인 시도의 결과. 화면은 이 합집합으로 분기한다.
 *
 * 서버는 200(세션 발급)과 403(상태 차단)으로 나누지만, 앱 입장에서는 <b>둘 다 정상 흐름</b>이다 —
 * 상태 차단은 오류 화면이 아니라 사용자가 머물러 읽어야 하는 목적지다 (design.md §1.1).
 */
export type LoginOutcome =
  | {kind: 'session'; tokens: TokenPair; user: UserSummary}
  | {
      kind: 'blocked';
      accountStatus: AccountStatusView;
      /** `REJECTED` 에만 실려 온다. 계정 삭제를 개시할 때 쓴다 (AC-50) */
      deletionToken: string | null;
    };

/** 로그인 화면 상단의 세션 배너 사유 (design.md §4.3). */
export type SessionNotice = 'expired' | 'revoked' | null;

/** 잠금 응답이 실어 오는 값 (AC-17 · AC-41). */
export type LoginLockInfo = {
  /** 서버가 올림·최소 1분을 보장한 값. 앱은 그대로 렌더한다 */
  remainingMinutes: number;
  supportContactEmail: string | null;
};
