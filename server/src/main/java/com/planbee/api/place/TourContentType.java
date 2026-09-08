package com.planbee.api.place;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * 계약의 `category` 파라미터 값 ↔ TourAPI `contentTypeId` ↔ 화면 라벨.
 *
 * <p>계약(openapi.yaml)의 `category` enum 과 이 목록이 어긋나면 검증을 통과한 값이 매핑에서
 * 빠진다 — 둘을 같이 고친다.
 *
 * <p>축제공연행사(15)는 기간이 있어 "주변 장소" 목록의 성격과 맞지 않아 제외한다.
 */
public enum TourContentType {

	ATTRACTION("attraction", 12, "관광지"),
	CULTURE("culture", 14, "문화시설"),
	LEISURE("leisure", 28, "레포츠"),
	ACCOMMODATION("accommodation", 32, "숙박"),
	SHOPPING("shopping", 38, "쇼핑"),
	RESTAURANT("restaurant", 39, "음식점");

	/** `category` 파라미터를 생략했을 때의 기본값 (계약 설명과 일치). */
	public static final List<TourContentType> DEFAULT = List.of(ATTRACTION, CULTURE);

	private final String apiValue;
	private final int contentTypeId;
	private final String label;

	TourContentType(String apiValue, int contentTypeId, String label) {
		this.apiValue = apiValue;
		this.contentTypeId = contentTypeId;
		this.label = label;
	}

	public int contentTypeId() {
		return contentTypeId;
	}

	public String label() {
		return label;
	}

	/** 계약 파라미터 값으로 찾는다. 없는 값이면 빈 Optional — 호출부가 400 으로 거절한다. */
	public static Optional<TourContentType> fromApiValue(String value) {
		return Arrays.stream(values()).filter(type -> type.apiValue.equals(value)).findFirst();
	}

	/** TourAPI 응답의 `contenttypeid` 로 화면 라벨을 찾는다. */
	public static Optional<TourContentType> fromContentTypeId(int id) {
		return Arrays.stream(values()).filter(type -> type.contentTypeId == id).findFirst();
	}
}
