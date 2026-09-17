package com.planbee.api.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 승인 · 거절 · 정지 · 정지 해제의 성공 응답. 결과 상태가 처리 완료 목록에 속한다.
 *
 * <p>{@code user} 를 함께 내리는 이유는 정지·정지 해제 때문이다 — 그 둘은 목록에서 항목이
 * 사라지지 않고 <b>배지와 시각만 바뀐다</b>. 새 배지 라벨과 접두어를 앱이 만들면 C-8 위반이므로
 * 서버가 갱신된 항목을 준다. 승인·거절에는 필요 없지만 네 처리의 응답 형태를 하나로 두는 편이
 * 앱의 분기를 줄인다.
 *
 * @param pendingApprovalCount <b>처리 직후의</b> 검토 대기 건수 (AC-32). 앱은 화면에서 ±1 하지
 *                             않는다 (M-18). 승인·거절이면 줄고 정지·정지 해제면 변하지 않는데,
 *                             그건 결과의 서술이지 계산 방법이 아니다
 */
@Schema(type = "object", description = "상태 전이 결과 (결과 상태가 처리 완료 목록에 속하는 경우)")
public record ProcessedUserActionResult(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, minimum = "0",
				example = "2") int pendingApprovalCount,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) ProcessedUserItem user) {
}
