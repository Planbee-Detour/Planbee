/**
 * `auth` 가 스택에 등록하는 화면과 그 파라미터. design.md §1.1 의 스택 구성을 그대로 옮겼다.
 *
 * <b>여기 있는 이유</b> (M-2): 의존 방향은 `app/` → `features/` → `shared/` 다.
 * 파라미터 목록을 `app/navigation/types.ts` 에 두면 그 파라미터를 쓰는 화면 8개가
 * 거꾸로 `app/` 을 import 하게 되고 두 계층이 서로를 가리킨다. 기능이 자기 화면의 파라미터를
 * 선언하고, `app/` 이 그것을 **조합**해 스택 파라미터 목록을 만든다.
 * (2026-08-27, defects.md D-M3)
 *
 * <b>계정 상태 안내 데이터를 파라미터로 넘기는 이유</b>: 로그인 응답에 한 번 실려 오고
 * 그 화면에서만 쓰는 값이다. 전역 상태에 복사하면 서버 데이터가 두 곳에 살게 되고(M-4),
 * 화면을 떠난 뒤 언제 지울지가 새 문제가 된다. 상태 확인만을 위한 재조회도 계약에 없다 (AC-46).
 */
import type {LegalDocumentKey} from './legal/documents.generated';
import type {AccountStatusView} from './types';

/** 약관 뷰어의 진입 출처. 하단 액션 바 유무가 갈린다 (design.md §6.7). */
export type LegalOrigin = 'signup' | 'settings' | 'status';

/** 계정 삭제 화면의 진입 출처. 취소·완료 시 돌아갈 곳만 다르다 (design.md §9.1) */
export type AccountDeleteOrigin = 'status' | 'settings';

/** 세션이 없을 때의 스택 (design.md §1.1) */
export type AuthRouteParams = {
  Splash: undefined;
  Login: undefined;
  SignUp:
    | {
        /**
         * 약관 뷰어에서 "동의하고 닫기" 로 돌아왔을 때 체크할 항목 (design.md §6.7).
         * 가입 화면이 적용한 뒤 즉시 비운다 — 남겨 두면 화면이 다시 그려질 때 또 적용된다.
         */
        agreedDocument?: LegalDocumentKey;
      }
    | undefined;
  AccountStatus: {
    accountStatus: AccountStatusView;
    /** `REJECTED` 에만 있다. 계정 삭제를 개시할 때 쓴다 (AC-50) */
    deletionToken: string | null;
  };
  AccountDelete: AccountDeleteRouteParams;
  LegalDocument: LegalDocumentRouteParams;
};

/** 세션이 있을 때의 스택. `auth` 가 소유한 화면만 적는다 — 홈은 다른 기능이 채운다 */
export type MainRouteParams = {
  Home: undefined;
  Settings: undefined;
  AccountDelete: AccountDeleteRouteParams;
  LegalDocument: LegalDocumentRouteParams;
};

/** 두 스택에 같은 모양으로 등록된다 (design.md §9.1) */
export type AccountDeleteRouteParams = {
  /**
   * 세션이 없는 삭제 경로에서만 채워진다 (`REJECTED` 상태 화면 → 계정 삭제).
   * 로그인된 사용자는 저장된 액세스 토큰을 쓰므로 비워 둔다.
   */
  deletionToken?: string;
  origin: AccountDeleteOrigin;
};

export type LegalDocumentRouteParams = {document: LegalDocumentKey; origin: LegalOrigin};
