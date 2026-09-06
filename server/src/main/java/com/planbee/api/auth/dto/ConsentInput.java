package com.planbee.api.auth.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.planbee.api.auth.ConsentType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 가입 요청에 실려 오는 동의 한 건 (AC-8).
 *
 * @param type    동의 항목. 요청에는 3종이 모두 와야 한다
 * @param agreed  동의 여부. {@code TERMS}·{@code PRIVACY} 는 {@code true} 여야 한다 (AC-6)
 * @param version 동의한 문서의 버전. 앱이 <b>번들된 원본에서 읽은 값</b>을 보낸다.
 *                {@code MARKETING} 은 대응 문서가 없어 비어 있다
 */
@Schema(type = "object", description = "동의 이력 입력")
public record ConsentInput(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "TERMS")
		@NotNull ConsentType type,

		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, example = "true")
		@NotNull Boolean agreed,

		@Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED, types = {"string", "null"}, example = "v1.0")
		@Size(max = 20) String version) {
}
