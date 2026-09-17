package com.planbee.api.admin.dto;

import com.planbee.api.auth.UserStatus;

/**
 * 처리 완료 목록에 나타날 수 있는 상태. <b>{@code PENDING} 이 없다</b> — 대기 항목은
 * {@link PendingUserItem} 이고, 두 목록은 서로 배타적이다.
 *
 * <p>auth 의 {@link UserStatus}(네 값)와 이름이 같아도 다른 스키마다. 계약이 이 셋만 열거하므로
 * 그대로 {@code UserStatus} 를 내보내면 앱의 생성 타입에 {@code PENDING} 이 섞인다.
 *
 * <p><b>표시 문자열을 여기 들고 있는 이유</b>는 C-8 / M-18 이다. 앱이 {@code status} 로
 * switch 해서 한국어를 고르면 위반이고, 서버가 완성해서 내려야 한다. 라벨과 접두어를 상태 옆에
 * 두면 셋이 갈라질 수 없다.
 *
 * <p>시각을 붙인 완성 문장("승인 2026. 9. 1. 09:12")을 내리지 않는 이유는 C-2 다 —
 * 그러면 앱이 UTC → 로컬 변환을 할 수 없다. <b>문자열은 서버, 시각 포맷팅은 앱</b>으로 가른다.
 */
public enum ProcessedStatus {

	APPROVED("승인됨", "승인"),
	SUSPENDED("정지됨", "정지"),
	REJECTED("거절됨", "거절");

	private final String label;
	private final String prefix;

	ProcessedStatus(String label, String prefix) {
		this.label = label;
		this.prefix = prefix;
	}

	/**
	 * @throws IllegalArgumentException {@code PENDING} 이 들어오면 — 호출부가 목록을 잘못 나눈 것이다
	 */
	public static ProcessedStatus from(UserStatus status) {
		return switch (status) {
			case APPROVED -> APPROVED;
			case SUSPENDED -> SUSPENDED;
			case REJECTED -> REJECTED;
			case PENDING -> throw new IllegalArgumentException("처리 완료 목록에 PENDING 이 들어올 수 없습니다");
		};
	}

	/** 상태 배지에 그대로 넣는 문자열. */
	public String label() {
		return label;
	}

	/** 목록 행에서 처리 시각 앞에 붙이는 문자열. */
	public String prefix() {
		return prefix;
	}
}
