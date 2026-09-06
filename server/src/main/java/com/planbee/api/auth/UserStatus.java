package com.planbee.api.auth;

/**
 * 계정 상태. 신규 가입은 항상 {@link #PENDING} 으로 시작하고, 상태를 바꾸는 것은
 * 관리자 승인 기능(admin-user-approval)이다. auth 는 상태를 <b>읽어서 판정</b>만 한다.
 *
 * <p>{@link #APPROVED} 에만 토큰을 발급한다. 나머지 셋은 비밀번호가 맞아도 세션이 성립하지 않고
 * 상태 안내 화면으로 간다 (AC-14·15·16).
 */
public enum UserStatus {

	PENDING,
	APPROVED,
	REJECTED,
	SUSPENDED;

	/** 로그인해서 앱을 쓸 수 있는 상태인가. */
	public boolean canSignIn() {
		return this == APPROVED;
	}

	/**
	 * 앱 안에서 스스로 계정 삭제를 개시할 수 있는 상태인가 (AC-50).
	 *
	 * <p>{@code SUSPENDED} 는 제외한다 — 즉시 파기(PRD 제약) + AC-32(같은 이메일 재가입 가능)와
	 * 겹치면 정지된 사용자가 지우고 곧바로 재가입해 정지를 무력화할 수 있다.
	 * {@code SUSPENDED} 의 삭제 요청 경로는 문의(AC-39)로 남는다.
	 */
	public boolean canSelfDeleteWithoutSession() {
		return this == REJECTED;
	}
}
