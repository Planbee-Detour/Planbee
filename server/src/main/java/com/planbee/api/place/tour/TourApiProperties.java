package com.planbee.api.place.tour;

import java.time.Duration;

import jakarta.validation.constraints.NotBlank;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/**
 * 한국관광공사 TourAPI(KorService2) 접속 설정.
 *
 * @param baseUrl        KorService2 기본 URL
 * @param serviceKey     data.go.kr 에서 발급한 서비스 키. <b>디코딩(일반) 키</b>를 넣는다 —
 *                       HTTP 클라이언트가 한 번 인코딩하므로 인코딩 키를 넣으면 이중 인코딩된다.
 *                       값은 환경변수 {@code TOUR_API_KEY} 로만 주입한다 (common.md C-4).
 * @param connectTimeout 연결 타임아웃
 * @param readTimeout    응답 타임아웃 — 초과 시 {@code PLACE_UPSTREAM_UNAVAILABLE}
 */
@Validated
@ConfigurationProperties(prefix = "planbee.place.tour")
public record TourApiProperties(
		@DefaultValue("https://apis.data.go.kr/B551011/KorService2") String baseUrl,
		@NotBlank String serviceKey,
		@DefaultValue("2s") Duration connectTimeout,
		@DefaultValue("4s") Duration readTimeout) {
}
