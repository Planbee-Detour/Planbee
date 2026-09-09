package com.planbee.api.auth;

/**
 * 가입 신청이 <b>접수되어 커밋된</b> 사실. (admin-user-approval AC-26 · AC-27 · AC-30)
 *
 * <p>auth 는 "일어났다" 만 알리고 무엇을 할지는 듣는 쪽이 정한다. 지금 듣는 쪽은 관리자
 * Discord 알림 하나다. auth 가 알림을 직접 부르면 auth → admin → auth 순환이 생긴다 (S-2).
 *
 * <p><b>식별자만 담는다.</b> 이메일·가입 사유를 이벤트에 실으면 그 값이 알림 페이로드까지
 * 흘러갈 여지가 생긴다 — 알림에는 개인정보를 일절 담지 않기로 확정돼 있다 (AC-31, 국외 이전 회피).
 * 지금은 듣는 쪽이 이 값조차 쓰지 않지만, "어느 신청이었는가" 는 로그를 되짚을 때 필요하다.
 *
 * @param userId 접수된 계정의 식별자
 */
public record SignupCompletedEvent(Long userId) {
}
