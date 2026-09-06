package com.planbee.api.auth.dto;

import java.time.Instant;

import com.planbee.api.auth.BlockedAccountStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * <b>상태 안내 화면 하나를 통째로 그리는 값</b> (AC-46).
 *
 * <p>가입 신청 201 응답({@link SignupResponse})과 로그인 차단 403 응답이 이 record 하나를
 * 함께 쓴다. 가입 직후와 로그인 차단은 같은 화면이므로 스키마가 갈리면
 * "앱이 문구를 조합하지 않는다"(C-8)가 두 곳에서 따로 관리된다.
 *
 * <p><b>문구는 서버가 완성해서 내린다.</b> 앱은 {@code status} 로 switch 해서 제목·본문을
 * 만들지 않는다. 앱이 {@code status} 로 결정하는 것은 아이콘·색·버튼 구성뿐이다.
 *
 * @param title               화면 제목
 * @param body                화면 본문
 * @param highlight           강조 카드. 세 상태 모두 존재한다
 * @param email               신청한 이메일. PENDING 화면의 정보 행에 쓰인다
 * @param appliedAt           가입 신청 시각 (ISO 8601 UTC). PENDING 화면의 "신청일"
 * @param supportContactEmail 문의 주소. <b>단수 문자열이고 null 일 수 있다</b> (AC-43·AC-45)
 */
@Schema(type = "object", description = "PENDING / REJECTED / SUSPENDED 안내 화면을 완성하는 값 (AC-46)")
public record AccountStatusView(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "PENDING") BlockedAccountStatus status,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "가입 신청을 검토하고 있어요") String title,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				example = "관리자가 신청 내용을 확인하고 있어요. 확인에는 시간이 조금 걸릴 수 있어요.") String body,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) AccountStatusHighlight highlight,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, format = "email",
				example = "name@example.com") String email,
		// OAS 3.1 에서 nullable 은 타입 배열로 표현한다. @Schema(nullable = true) 는 3.0 표기라
		// 생성 스펙에 반영되지 않아 계약과 어긋난다 (S-21 주변, contract.yaml "계약 표현의 제약").
		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"},
				format = "date-time", example = "2026-08-26T02:14:05Z") Instant appliedAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, types = {"string", "null"},
				format = "email", example = "support@planbee.app") String supportContactEmail) {
}
