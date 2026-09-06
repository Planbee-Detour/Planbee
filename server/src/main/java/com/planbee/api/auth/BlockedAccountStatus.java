package com.planbee.api.auth;

/**
 * 상태 안내 화면에 <b>실제로 나타날 수 있는</b> 계정 상태 (auth AC-14 · AC-15 · AC-16).
 *
 * <p>{@link UserStatus} 를 그대로 노출하지 않는 이유: {@code APPROVED} 는 세션을 받으므로
 * 이 화면에 도달하지 않는다. 그런데 {@code UserStatus} 를 그대로 쓰면 생성되는 스펙의 enum 에
 * {@code APPROVED} 가 섞여, 모바일이 "올 수 있다" 고 읽고 다루지 않아도 될 분기를 만들게 된다.
 *
 * <p>불변식을 런타임 예외가 아니라 <b>타입</b>으로 표현하는 쪽이 낫다 —
 * 그래야 계약과 구현이 같은 것을 말한다.
 */
public enum BlockedAccountStatus {

	PENDING,
	REJECTED,
	SUSPENDED;

	static BlockedAccountStatus from(UserStatus status) {
		return switch (status) {
			case PENDING -> PENDING;
			case REJECTED -> REJECTED;
			case SUSPENDED -> SUSPENDED;
			case APPROVED -> throw new IllegalStateException("APPROVED 는 상태 안내 화면 대상이 아니다");
		};
	}
}
