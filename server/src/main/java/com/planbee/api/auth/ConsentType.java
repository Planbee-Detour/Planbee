package com.planbee.api.auth;

/**
 * 동의 이력에 남는 항목 (AC-8).
 *
 * <p><b>만 14세 이상 확인은 여기 없다.</b> 그건 약관에 대한 동의가 아니라 자기 확인(attestation)이고,
 * 대응 문서가 존재하지 않아 "동의한 약관의 버전" 이라는 값이 성립하지 않는다.
 * 사용자 레코드의 확인 시각 필드로 분리했다 (2026-08-25 확정, design.md §5.4).
 */
public enum ConsentType {

	/** 이용약관. 필수 — 동의하지 않으면 가입할 수 없다 (AC-6). */
	TERMS(true),

	/** 개인정보 수집·이용. 필수 (AC-6). */
	PRIVACY(true),

	/**
	 * 마케팅·알림 수신. 선택 (AC-7).
	 *
	 * <p>대응 문서가 저장소에 아직 없어 약관 버전이 비어 있을 수 있다.
	 * 거부해도 "거부함" 으로 이력을 남긴다 — 정보통신망법상 광고성 정보 발송 증빙 때문이다.
	 */
	MARKETING(false);

	private final boolean required;

	ConsentType(boolean required) {
		this.required = required;
	}

	public boolean isRequired() {
		return required;
	}
}
