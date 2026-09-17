/**
 * `admin-user-approval` 이 스택에 등록하는 화면과 그 파라미터 (design.md §2.2).
 *
 * <b>여기 있는 이유</b> (M-2): 의존 방향은 `app/` → `features/` → `shared/` 다.
 * 기능이 자기 화면의 파라미터를 선언하고 `app/navigation/types.ts` 가 그것을 조합한다.
 *
 * `UserApprovalList` 는 <b>스택 화면</b>이다 — 탭도 모달도 아니다. 하단 탭바는 건드리지 않고
 * (결정 1) 설정 화면에서 push 되어 뒤로가기로 돌아온다.
 * 상세 시트(§6·§7)는 이 화면 안의 오버레이라 라우트를 따로 두지 않는다 —
 * 딥링크 대상이 아니고, 시트를 닫은 뒤 목록의 스크롤 위치와 세그먼트 선택이 유지되어야 한다.
 */
export type AdminRouteParams = {
  UserApprovalList: undefined;
};
