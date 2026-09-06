package com.planbee.api.auth;

import org.springframework.stereotype.Component;

import com.planbee.api.auth.dto.AccountStatusHighlight;
import com.planbee.api.auth.dto.AccountStatusView;

/**
 * 계정 상태 안내 화면의 <b>문구를 서버가 완성해서 내린다</b> (C-8 / S-22 / AC-46).
 *
 * <p>여기 있는 한국어는 design.md §11.3 이 확정한 값이며 <b>토씨까지 그대로</b>다.
 * 앱은 이 문자열을 렌더만 하고 상태 코드로 switch 해서 문장을 만들지 않는다 —
 * 그렇게 하면 같은 규칙이 iOS·Android·서버 세 곳에 중복되고, 문구를 고칠 때마다
 * 앱 배포를 기다려야 한다.
 *
 * <p><b>문구 안에 문의 주소를 넣지 않는다.</b> 주소는 별도 필드로 나간다 —
 * 주소가 없을 때(AC-43) 문장이 깨지지 않아야 하고, 서버가 문자열을 조립하지 않아야 한다.
 */
@Component
public class AccountStatusMessages {

	private final AuthProperties properties;

	public AccountStatusMessages(AuthProperties properties) {
		this.properties = properties;
	}

	/**
	 * 가입 직후(AC-1)와 로그인 차단(AC-14·15·16)이 <b>같은 화면</b>이므로 같은 값을 만든다.
	 *
	 * @param status    PENDING / REJECTED / SUSPENDED
	 * @param email     신청한 이메일
	 * @param appliedAt 가입 신청 시각
	 */
	public AccountStatusView of(UserStatus status, String email, java.time.Instant appliedAt) {
		return switch (status) {
			case PENDING -> new AccountStatusView(
					BlockedAccountStatus.from(status),
					"가입 신청을 검토하고 있어요",
					"관리자가 신청 내용을 확인하고 있어요. 확인에는 시간이 조금 걸릴 수 있어요.",
					new AccountStatusHighlight(
							"승인되면 다시 로그인해 주세요",
							"따로 알림을 보내드리지 않아요. 나중에 앱을 열어 다시 로그인하면 승인 여부를 확인할 수 있어요."),
					email,
					appliedAt,
					properties.supportContactEmailOrNull());

			case REJECTED -> new AccountStatusView(
					BlockedAccountStatus.from(status),
					"가입이 승인되지 않았어요",
					"신청 내용을 확인했지만 이번에는 승인되지 않았어요. 이 계정으로는 로그인할 수 없어요.",
					new AccountStatusHighlight(
							"다시 검토받고 싶거나 정보를 지우고 싶다면",
							"가입할 때 쓴 이메일 주소와 함께 아래로 알려주시면 확인 후 도와드릴게요."),
					email,
					appliedAt,
					properties.supportContactEmailOrNull());

			case SUSPENDED -> new AccountStatusView(
					BlockedAccountStatus.from(status),
					"이용이 정지된 계정이에요",
					"서비스 운영 정책에 따라 이 계정의 이용이 정지되었어요. 정지 중에는 로그인할 수 없어요.",
					new AccountStatusHighlight(
							"정지에 이의가 있다면",
							"아래로 알려주시면 확인해 드릴게요. 자세한 기준은 이용약관 제8조에서 볼 수 있어요."),
					email,
					appliedAt,
					properties.supportContactEmailOrNull());

			// APPROVED 는 상태 안내 화면에 오지 않는다 — 여기 도달하면 호출부의 분기가 잘못된 것이다.
			case APPROVED -> throw new IllegalStateException("APPROVED 는 상태 안내 화면 대상이 아니다");
		};
	}

	/** 잠금 응답과 상태 화면이 <b>같은 설정값</b>을 쓴다는 사실을 한 곳에서 보장한다. */
	public String supportContactEmail() {
		return properties.supportContactEmailOrNull();
	}

	AuthErrorCode blockedCodeOf(UserStatus status) {
		return switch (status) {
			case PENDING -> AuthErrorCode.ACCOUNT_PENDING;
			case REJECTED -> AuthErrorCode.ACCOUNT_REJECTED;
			case SUSPENDED -> AuthErrorCode.ACCOUNT_SUSPENDED;
			case APPROVED -> throw new IllegalStateException("APPROVED 는 차단 대상이 아니다");
		};
	}
}
