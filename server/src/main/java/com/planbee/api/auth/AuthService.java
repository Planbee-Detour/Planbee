package com.planbee.api.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.planbee.api.auth.dto.AccountDeleteRequest;
import com.planbee.api.auth.dto.AccountStatusView;
import com.planbee.api.auth.dto.ConsentInput;
import com.planbee.api.auth.dto.LoginRequest;
import com.planbee.api.auth.dto.LoginResponse;
import com.planbee.api.auth.dto.SignupRequest;
import com.planbee.api.auth.dto.SignupResponse;
import com.planbee.api.auth.dto.TokenPair;
import com.planbee.api.auth.dto.UserSummary;
import com.planbee.api.common.error.BusinessException;
import com.planbee.api.common.error.CommonErrorCode;
import com.planbee.api.common.error.FieldErrorDetail;
import com.planbee.api.common.security.TokenScope;

/**
 * 가입 · 로그인 · 계정 조회 · 계정 삭제.
 *
 * <p>이 클래스가 지키는 가장 미묘한 규칙은 <b>"무엇을 구분하고 무엇을 구분하지 않는가"</b> 다.
 * 계정 존재 여부는 응답 내용으로도 응답 시간으로도 새어 나가면 안 되고(AC-13·AC-47),
 * 계정 상태 3종은 반대로 또렷하게 구분되어야 한다(AC-14·15·16).
 * {@link #login} 의 단계 주석이 그 순서를 설명한다.
 */
@Service
public class AuthService {

	/** ProblemDetail 확장 필드 이름. 계약에 적힌 그대로 쓴다 (Map 키라 snake_case 변환을 타지 않는다). */
	private static final String ACCOUNT_STATUS_PROPERTY = "account_status";
	private static final String DELETION_TOKEN_PROPERTY = "deletion_token";
	private static final String DELETION_TOKEN_EXPIRES_IN_PROPERTY = "deletion_token_expires_in";
	private static final String LOCK_REMAINING_MINUTES_PROPERTY = "lock_remaining_minutes";
	private static final String SUPPORT_CONTACT_EMAIL_PROPERTY = "support_contact_email";
	private static final String ERRORS_PROPERTY = "errors";
	private static final String RETRY_AFTER_HEADER = "Retry-After";

	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final RefreshTokenService refreshTokenService;
	private final AccountStatusMessages statusMessages;
	private final LoginAttemptGuard loginAttemptGuard;
	private final SignupRateLimiter signupRateLimiter;
	private final PasswordEncoder passwordEncoder;
	private final TokenIssuer tokenIssuer;
	private final AuthProperties authProperties;
	private final Clock clock;

	/**
	 * 미등록 이메일에도 돌릴 더미 해시.
	 *
	 * <p>계정이 없다고 bcrypt 를 건너뛰면 <b>응답 시간으로 계정 존재가 드러난다</b> —
	 * 등록된 이메일은 수십 ms, 미등록은 즉시 응답하므로 AC-13 의 "동일한 응답" 이 무너진다.
	 * 무작위 값을 기동 시점에 인코딩해 쓰므로 코드나 저장소에 상수 해시를 남기지 않는다.
	 */
	private final String dummyPasswordHash;

	public AuthService(
			UserRepository userRepository,
			RefreshTokenRepository refreshTokenRepository,
			RefreshTokenService refreshTokenService,
			AccountStatusMessages statusMessages,
			LoginAttemptGuard loginAttemptGuard,
			SignupRateLimiter signupRateLimiter,
			PasswordEncoder passwordEncoder,
			TokenIssuer tokenIssuer,
			AuthProperties authProperties,
			Clock clock) {
		this.userRepository = userRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.refreshTokenService = refreshTokenService;
		this.statusMessages = statusMessages;
		this.loginAttemptGuard = loginAttemptGuard;
		this.signupRateLimiter = signupRateLimiter;
		this.passwordEncoder = passwordEncoder;
		this.tokenIssuer = tokenIssuer;
		this.authProperties = authProperties;
		this.clock = clock;
		this.dummyPasswordHash = passwordEncoder.encode(UUID.randomUUID().toString());
	}

	// ─────────────────────────────────────────────────────────────────
	// 가입
	// ─────────────────────────────────────────────────────────────────

	/**
	 * 가입 신청 (AC-1). 계정은 항상 {@code PENDING} 으로 만들어지고, 응답은 검토 중 화면을
	 * 그대로 그릴 수 있는 값 전부를 담는다 (AC-46).
	 *
	 * @param clientKey 레이트 리밋 집계 키 (요청 IP)
	 */
	@Transactional
	public SignupResponse signup(SignupRequest request, String clientKey) {
		signupRateLimiter.registerAndCheck(clientKey).ifPresent(retryAfter -> {
			throw new BusinessException(AuthErrorCode.SIGNUP_RATE_LIMITED)
					.withHeader(RETRY_AFTER_HEADER, String.valueOf(Math.max(1, retryAfter.toSeconds())));
		});

		validateConsents(request.consents());

		String email = User.normalizeEmail(request.email());
		if (userRepository.existsByEmail(email)) {
			// 숨기지 않는다 — 인수된 위험이다 (AC-2, PRD 제약).
			throw new BusinessException(AuthErrorCode.EMAIL_ALREADY_REGISTERED);
		}

		Instant now = clock.instant();
		User user = User.register(
				email,
				passwordEncoder.encode(request.password()),
				blankToNull(request.signupReason()),
				now);

		// 3종 모두 남긴다 — 거부한 항목도 "거부함" 으로 남아야 증빙이 된다 (AC-8).
		for (ConsentInput consent : request.consents()) {
			user.addConsent(UserConsent.record(
					consent.type(),
					Boolean.TRUE.equals(consent.agreed()),
					blankToNull(consent.version()),
					now));
		}

		User saved = userRepository.save(user);
		return new SignupResponse(statusMessages.of(saved.status(), saved.email(), saved.createdAt()));
	}

	/**
	 * 동의 3종이 모두 왔는지, 필수 2종에 동의했는지 확인한다 (AC-6 · AC-7).
	 *
	 * <p>Bean Validation 으로는 "정확히 이 세 종류" 를 표현할 수 없어 여기서 검사하고,
	 * 응답 형식은 검증 실패와 동일하게 맞춘다 — 모바일이 두 가지 실패를 다르게 다룰 이유가 없다.
	 */
	private void validateConsents(List<ConsentInput> consents) {
		Map<ConsentType, Boolean> agreedByType = new EnumMap<>(ConsentType.class);
		for (ConsentInput consent : consents) {
			agreedByType.put(consent.type(), Boolean.TRUE.equals(consent.agreed()));
		}

		List<FieldErrorDetail> errors = java.util.Arrays.stream(ConsentType.values())
				.filter(type -> !agreedByType.containsKey(type)
						|| (type.isRequired() && !agreedByType.get(type)))
				.map(type -> new FieldErrorDetail(
						"consents",
						agreedByType.containsKey(type) ? "ASSERT_TRUE" : "NOT_NULL",
						"필수 항목에 동의해야 가입을 신청할 수 있어요."))
				.toList();

		if (!errors.isEmpty()) {
			throw new BusinessException(CommonErrorCode.VALIDATION_FAILED)
					.withExtension(ERRORS_PROPERTY, errors);
		}
	}

	// ─────────────────────────────────────────────────────────────────
	// 로그인
	// ─────────────────────────────────────────────────────────────────

	/**
	 * 로그인. 아래 순서를 지켜야 AC-13 · AC-47 · AC-48 이 동시에 성립한다.
	 *
	 * <ol>
	 *   <li>이메일 정규화 — 카운터의 키가 계정이 아니라 이 문자열이다 (AC-47)</li>
	 *   <li>잠금 확인을 <b>비밀번호 검증보다 먼저</b> — 잠금 중 재시도가 잠금을 늘리지 않는다 (AC-48)</li>
	 *   <li>계정이 없어도 더미 해시로 bcrypt 를 한 번 돌린다 — 응답 시간을 맞춘다 (AC-13)</li>
	 *   <li>비밀번호 대조 — 실패하면 카운트, 성공하면 초기화</li>
	 *   <li>계정 상태 분기 — {@code APPROVED} 만 토큰을 받는다</li>
	 * </ol>
	 */
	@Transactional
	public LoginResponse login(LoginRequest request) {
		String email = User.normalizeEmail(request.email());

		loginAttemptGuard.lockRemaining(email).ifPresent(remaining -> {
			throw lockedException(remaining);
		});

		Optional<User> found = userRepository.findByEmail(email);
		boolean passwordMatches = found
				.map(user -> passwordEncoder.matches(request.password(), user.passwordHash()))
				.orElseGet(() -> {
					passwordEncoder.matches(request.password(), dummyPasswordHash);
					return false;
				});

		if (!passwordMatches) {
			loginAttemptGuard.recordFailure(email);
			throw new BusinessException(AuthErrorCode.INVALID_CREDENTIALS);
		}

		loginAttemptGuard.reset(email);

		User user = found.orElseThrow();
		if (!user.status().canSignIn()) {
			throw accountBlockedException(user);
		}

		TokenPair tokens = refreshTokenService.issuePair(user);
		return new LoginResponse(tokens, toSummary(user));
	}

	/**
	 * 액세스 토큰 갱신 (AC-22 ~ AC-25, AC-49).
	 *
	 * <p>회전 자체는 {@link RefreshTokenService} 가 하고, 이 메서드는 거기에
	 * <b>갱신 시점의 계정 상태 확인</b>을 엮는다. 이 조합이 서비스 밖에 있으면
	 * (예: 컨트롤러의 인자 배선) 상태 확인을 빠뜨렸을 때 정지·거절 계정이 30분마다
	 * 무한히 갱신되는데 그것을 막는 지점이 서비스 밖에 남는다 (S-5).
	 *
	 * <p>상태 확인은 <b>재사용 판정 뒤에</b> 선다 — 순서는 {@code RefreshTokenService.rotate}
	 * 가 정하며 계약에 명시돼 있다. 재사용으로 걸린 요청은 계정 상태와 무관하게 401 이다.
	 */
	@Transactional
	public TokenPair refresh(String rawRefreshToken) {
		return refreshTokenService.rotate(rawRefreshToken, this::assertCanStillSignIn);
	}

	/** 갱신 시점의 계정 상태 확인. 정지·거절이 액세스 토큰 수명 안에 반영되는 지점이다. */
	private void assertCanStillSignIn(User user) {
		if (!user.status().canSignIn()) {
			throw accountBlockedException(user);
		}
	}

	// ─────────────────────────────────────────────────────────────────
	// 계정
	// ─────────────────────────────────────────────────────────────────

	@Transactional(readOnly = true)
	public UserSummary getMe(Long userId) {
		return userRepository.findById(userId)
				.map(this::toSummary)
				.orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));
	}

	@Transactional
	public void logout(Long userId, String refreshToken) {
		refreshTokenService.revoke(userId, refreshToken);
	}

	/**
	 * 계정 삭제 — <b>즉시 파기</b>다 (AC-31, PRD 제약). 유예 기간을 두지 않고
	 * 이메일·비밀번호 해시·가입 사유·동의 이력을 지운다. 리프레시 토큰과 동의 이력은
	 * 연관 삭제(cascade)로 함께 사라진다.
	 *
	 * <p>비밀번호 재확인이 유일한 안전장치이므로 <b>서버에서도 독립적으로</b> 확인한다 (AC-29) —
	 * 앱이 막는 것에 기대지 않는다.
	 */
	@Transactional
	public void deleteAccount(Long userId, AccountDeleteRequest request) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new BusinessException(CommonErrorCode.UNAUTHORIZED));

		if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
			throw new BusinessException(AuthErrorCode.PASSWORD_MISMATCH);
		}

		refreshTokenRepository.revokeAllByUserId(
				userId, clock.instant(), RefreshToken.RevokeReason.LOGOUT);
		userRepository.delete(user);
	}

	// ─────────────────────────────────────────────────────────────────
	// 실패 응답 만들기
	// ─────────────────────────────────────────────────────────────────

	/**
	 * 잠금 응답 (AC-17 · AC-41 · AC-47).
	 *
	 * <p>남은 시간은 <b>서버가 올림하고 최소 1분</b>을 보장해 내린다 — 앱은 계산하지 않는다.
	 * {@code Retry-After} 는 표준 헤더라 올림하지 않은 실제 초를 담는다.
	 */
	private BusinessException lockedException(Duration remaining) {
		return new BusinessException(AuthErrorCode.LOGIN_LOCKED)
				.withExtension(LOCK_REMAINING_MINUTES_PROPERTY, LoginAttemptGuard.toRemainingMinutes(remaining))
				.withExtension(SUPPORT_CONTACT_EMAIL_PROPERTY, statusMessages.supportContactEmail())
				.withHeader(RETRY_AFTER_HEADER, String.valueOf(Math.max(1, remaining.toSeconds())));
	}

	/**
	 * 계정 상태로 인한 차단 (AC-14 · AC-15 · AC-16).
	 *
	 * <p>{@code REJECTED} 에만 삭제 전용 토큰을 함께 내린다 (AC-50). 이 사용자는 비밀번호를
	 * 이미 맞힌 상태라 삭제를 개시할 자격이 증명되어 있고, 로그인이 막혀 설정 화면에는
	 * 도달할 수 없다. {@code SUSPENDED} 에는 내리지 않는다 — 지우고 곧바로 재가입하면
	 * 정지가 무력화되기 때문이다 (PRD 제약).
	 */
	private BusinessException accountBlockedException(User user) {
		AccountStatusView view = statusMessages.of(user.status(), user.email(), user.createdAt());
		BusinessException exception = new BusinessException(statusMessages.blockedCodeOf(user.status()))
				.withExtension(ACCOUNT_STATUS_PROPERTY, view);

		if (user.status().canSelfDeleteWithoutSession()) {
			Duration ttl = authProperties.deletionTokenTtl();
			String deletionToken = tokenIssuer.issueAccessToken(
					user.id(), user.email(), TokenScope.ACCOUNT_DELETE, clock.instant(), ttl);
			exception
					.withExtension(DELETION_TOKEN_PROPERTY, deletionToken)
					.withExtension(DELETION_TOKEN_EXPIRES_IN_PROPERTY, ttl.toSeconds());
		}
		return exception;
	}

	private UserSummary toSummary(User user) {
		return new UserSummary(user.email(), user.role(), user.status());
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}
}
