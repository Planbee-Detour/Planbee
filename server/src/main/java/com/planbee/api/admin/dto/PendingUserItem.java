package com.planbee.api.admin.dto;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 검토 대기 목록의 한 행이자 <b>신청 상세 시트 전체</b>다 (design.md §5.3 · §6.3).
 * 시트를 열 때 추가 조회를 하지 않는다 (C-8).
 *
 * @param signupReasonText <b>화면에 그대로 넣는 완성된 문자열이고 절대 {@code null} 이 아니다</b>
 *                         (AC-33). 원본 가입 사유는 선택 항목이라 비어 있을 수 있고, 그때는
 *                         서버가 대체 문구를 채워서 내린다. 필드 이름이 {@code signup_reason} 이
 *                         아니라 {@code signup_reason_text} 인 것도 "원본이 아니라 표시용" 을
 *                         이름으로 못 박기 위해서다
 * @param requestedAt      가입 신청 시각. 이 목록의 정렬 키다. <b>거절 취소로 되돌아온 항목도
 *                         이 값이 바뀌지 않는다</b> — 원래 자리로 돌아간다
 * @param isMe             로그인한 관리자 자신인가 (AC-25). 관리자는 {@code APPROVED} 라 이 목록에서는
 *                         늘 {@code false} 지만, 두 목록이 같은 규칙을 갖도록 담는다.
 *                         앱이 {@code /auth/me} 응답과 목록을 이메일로 맞춰 보면 C-8 / M-18 위반이다
 */
@Schema(type = "object", description = "검토 대기 목록의 한 행 (= 신청 상세 시트 전체)")
public record PendingUserItem(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "42") long userId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "email",
				example = "name@example.com") String email,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				example = "여행 중 일정이 자주 바뀌어서 써보고 싶어요.") String signupReasonText,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "date-time",
				example = "2026-09-05T05:20:00Z") Instant requestedAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "false") boolean isMe) {
}
