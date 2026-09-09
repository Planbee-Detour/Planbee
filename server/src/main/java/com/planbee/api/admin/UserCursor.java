package com.planbee.api.admin;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.planbee.api.common.error.BusinessException;
import com.planbee.api.common.error.CommonErrorCode;

/**
 * 목록 커서. <b>정렬 키와 동률 깨기 키(사용자 식별자)를 함께 담는다.</b>
 *
 * <p>오프셋을 쓰지 않는 이유는 이 목록이 <b>보면서 줄어들기</b> 때문이다 — 승인 한 건마다
 * 앞쪽 항목이 빠지므로 {@code offset=20} 이 이미 밀려난 위치를 가리켜 항목을 조용히 건너뛴다.
 *
 * <p><b>앱은 이 값을 해석하지 않는다.</b> 계약이 정한 것은 "불투명 문자열" 이라는 사실뿐이고
 * 인코딩 방식은 서버가 언제든 바꿀 수 있다. 그래서 Base64 안의 JSON 모양을 계약에 적지 않았고
 * 여기서도 응답에 그대로 노출되는 값 외의 의미를 담지 않는다.
 *
 * <p>형식이 깨졌으면 <b>400 으로 실패한다.</b> 빈 목록이나 첫 페이지로 눙치지 않는다 —
 * 조용히 첫 페이지를 돌려주면 무한 스크롤이 같은 항목을 반복해 그린다.
 *
 * @param sortKey 그 목록의 정렬 키 값 (검토 대기 = {@code requested_at}, 처리 완료 = {@code processed_at})
 * @param userId  동률 깨기 키
 */
public record UserCursor(Instant sortKey, Long userId) {

	/** 계약이 정한 커서 길이 상한. 넘으면 우리가 만든 값이 아니다. */
	private static final int MAX_ENCODED_LENGTH = 512;

	private static final Pattern FORMAT = Pattern.compile("^\\{\"t\":\"([^\"]+)\",\"i\":(\\d+)}$");

	/**
	 * 요청 파라미터를 커서로 바꾼다. 첫 페이지는 파라미터 자체가 없으므로 {@code null} 이
	 * 들어오고 {@code null} 이 나간다 — 그때는 조건을 걸지 않는다는 뜻이다.
	 *
	 * @throws BusinessException 해석할 수 없는 값이면 400 {@code MALFORMED_REQUEST}
	 */
	public static UserCursor decode(String encoded) {
		if (encoded == null || encoded.isBlank()) {
			return null;
		}
		if (encoded.length() > MAX_ENCODED_LENGTH) {
			throw malformed();
		}
		try {
			String json = new String(Base64.getUrlDecoder().decode(encoded), StandardCharsets.UTF_8);
			Matcher matcher = FORMAT.matcher(json);
			if (!matcher.matches()) {
				throw malformed();
			}
			return new UserCursor(Instant.parse(matcher.group(1)), Long.valueOf(matcher.group(2)));
		}
		catch (IllegalArgumentException | DateTimeParseException cause) {
			throw malformed();
		}
	}

	/** 다음 페이지 커서. 마지막 페이지에서는 이 메서드를 부르지 않고 {@code null} 을 내린다. */
	public String encode() {
		String json = "{\"t\":\"%s\",\"i\":%d}".formatted(sortKey, userId);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
	}

	private static BusinessException malformed() {
		return new BusinessException(CommonErrorCode.MALFORMED_REQUEST, "요청을 처리할 수 없어요.");
	}
}
