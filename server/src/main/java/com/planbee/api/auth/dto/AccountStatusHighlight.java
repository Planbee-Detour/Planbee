package com.planbee.api.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 상태 안내 화면의 강조 카드. 문구는 design.md §11.3 이 확정한 값이다.
 *
 * @param title 카드 제목
 * @param body  카드 본문. <b>문의 주소를 문장 안에 넣지 않는다</b> — 주소는 별도 필드이고,
 *              값이 없을 때(AC-43) 문장이 깨지면 안 되기 때문이다.
 */
@Schema(type = "object", description = "상태 안내 화면의 강조 카드")
public record AccountStatusHighlight(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "승인되면 다시 로그인해 주세요") String title,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				example = "따로 알림을 보내드리지 않아요. 나중에 앱을 열어 다시 로그인하면 승인 여부를 확인할 수 있어요.") String body) {
}
