package com.planbee.api.admin;

/**
 * 처리 기록에 남기는 동작 (AC-13). 상태 전이 엔드포인트와 1:1 이다.
 *
 * <p>계약의 응답에는 나가지 않는다 — 처리자·처리 시각을 화면에 그리지 않기로 확정됐다
 * (2026-09-07 Q2). 기록은 남기되 노출하지 않는다.
 */
public enum AdminAction {

	APPROVE,
	REJECT,
	CANCEL_REJECTION,
	SUSPEND,
	CANCEL_SUSPENSION
}
