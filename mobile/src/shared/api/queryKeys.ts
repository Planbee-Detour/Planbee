/**
 * 기능 경계를 넘어가는 react-query 키.
 *
 * 대부분의 쿼리 키는 그 기능 안에서만 쓰이므로 여기 오지 않는다. 여기 있는 것은
 * <b>한 기능이 캐시를 소유하고 다른 기능이 그것을 무효화해야 하는</b> 키뿐이다.
 *
 * `ACCOUNT_QUERY_KEY` 가 그렇다 — `auth` 의 설정 화면이 `GET /api/v1/auth/me` 로 계정 카드와
 * 관리자 섹션을 함께 그리는데(`admin-user-approval` design.md §13-1), 그 응답에 실린
 * `pending_approval_count` 는 관리자가 신청을 처리할 때마다 바뀐다. 처리한 쪽
 * (`admin-user-approval`)이 이 키를 무효화해야 설정 화면의 건수가 낡지 않는다.
 *
 * 키 문자열을 양쪽에 복사하면 한쪽만 바뀌었을 때 조용히 어긋난다. 그렇다고 다른 기능의
 * 모듈을 import 하면 M-2 위반이다 — 그래서 `shared/api` 에 이름 하나로 둔다.
 * 무효화만 한다. 다른 기능의 데이터를 <b>쓰지</b> 않는다.
 */
export const ACCOUNT_QUERY_KEY = ['auth', 'me'] as const;
