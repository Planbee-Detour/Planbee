package com.planbee.api.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.planbee.api.auth.dto.AccountDeleteRequest;
import com.planbee.api.auth.dto.LoginRequest;
import com.planbee.api.auth.dto.LoginResponse;
import com.planbee.api.auth.dto.RefreshRequest;
import com.planbee.api.auth.dto.SignupRequest;
import com.planbee.api.auth.dto.SignupResponse;
import com.planbee.api.auth.dto.TokenPair;
import com.planbee.api.auth.dto.UserSummary;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 계약: docs/features/auth/contract.yaml
 *
 * <p>컨트롤러는 입력 바인딩과 위임만 한다 (S-5). 오류 응답을 여기서 만들지 않는다 —
 * 서비스가 {@code BusinessException} 을 던지고 {@code GlobalExceptionHandler} 가
 * RFC 9457 로 변환한다 (S-7).
 */
@Tag(name = "auth")
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

	/**
	 * 이 컨트롤러가 아는 서비스는 하나뿐이다. 두 서비스를 여기서 엮으면 정책이 컨트롤러의
	 * 배선으로만 표현되어 서비스 밖으로 새어 나간다 (S-5) — 갱신 흐름은 {@code AuthService.refresh}
	 * 안에서 조합한다.
	 */
	private final AuthService authService;

	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	@Operation(operationId = "signup", summary = "가입 신청")
	@ApiResponse(responseCode = "201", description = "접수됨. 계정은 `PENDING` 상태다. (AC-1, AC-46)")
	@SecurityRequirements // SecurityConfig.PUBLIC_PATHS 와 일치시킨다 (S-19)
	@ResponseStatus(HttpStatus.CREATED)
	@PostMapping(path = "/signup", consumes = MediaType.APPLICATION_JSON_VALUE,
			produces = MediaType.APPLICATION_JSON_VALUE)
	public SignupResponse signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest) {
		return authService.signup(request, clientKey(httpRequest));
	}

	@Operation(operationId = "login", summary = "로그인")
	@ApiResponse(responseCode = "200", description = "로그인 성공. 계정 상태가 `APPROVED` 인 경우에만 도달한다. (AC-11)")
	@SecurityRequirements
	@PostMapping(path = "/login", consumes = MediaType.APPLICATION_JSON_VALUE,
			produces = MediaType.APPLICATION_JSON_VALUE)
	public LoginResponse login(@Valid @RequestBody LoginRequest request) {
		return authService.login(request);
	}

	@Operation(operationId = "refreshToken", summary = "액세스 토큰 갱신 (리프레시 회전)")
	@ApiResponse(responseCode = "200", description = """
			갱신 성공. 새 토큰 쌍을 반환한다 (AC-22).
			유예 창(10초) 안의 직전 토큰 재사용이면 **직전과 동일한 쌍**을 반환한다 (AC-49).
			서버가 직전 응답을 기억하지 못하면 200 이 아니라 401 `AUTH_REFRESH_TOKEN_REUSED` 다.
			""")
	@SecurityRequirements
	@PostMapping(path = "/token/refresh", consumes = MediaType.APPLICATION_JSON_VALUE,
			produces = MediaType.APPLICATION_JSON_VALUE)
	public TokenPair refreshToken(@Valid @RequestBody RefreshRequest request) {
		return authService.refresh(request.refreshToken());
	}

	@Operation(operationId = "logout", summary = "로그아웃 (이 기기의 리프레시 토큰 폐기)")
	@ApiResponse(responseCode = "204", description = "폐기됨 (또는 이미 폐기되어 있었다). 본문 없음. (AC-26)")
	// 계약이 operation 레벨로 security 를 명시한다 — 문서 레벨 기본만 두면 contract-check 가
	// api-security-removed(ERR) 로 본다 (S-19).
	@SecurityRequirement(name = "bearerAuth")
	@PostMapping(path = "/logout", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<Void> logout(
			@AuthenticationPrincipal Jwt principal,
			@Valid @RequestBody RefreshRequest request) {
		authService.logout(userId(principal), request.refreshToken());
		return ResponseEntity.noContent().build();
	}

	@Operation(operationId = "getMe", summary = "내 계정 정보 조회")
	@ApiResponse(responseCode = "200", description = "조회 성공")
	@SecurityRequirement(name = "bearerAuth")
	@GetMapping(path = "/me", produces = MediaType.APPLICATION_JSON_VALUE)
	public UserSummary getMe(@AuthenticationPrincipal Jwt principal) {
		return authService.getMe(userId(principal));
	}

	@Operation(operationId = "deleteMe", summary = "계정 삭제 (즉시 파기)")
	@ApiResponse(responseCode = "204",
			description = "삭제 완료. 본문 없음. 이 계정의 모든 리프레시 토큰도 함께 폐기된다. (AC-31)")
	@SecurityRequirement(name = "bearerAuth")
	@DeleteMapping(path = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
	public ResponseEntity<Void> deleteMe(
			@AuthenticationPrincipal Jwt principal,
			@Valid @RequestBody AccountDeleteRequest request) {
		authService.deleteAccount(userId(principal), request);
		return ResponseEntity.noContent().build();
	}

	/** JWT 의 {@code sub} 는 사용자 ID 다 ({@code TokenIssuer} 가 그렇게 발급한다). */
	private Long userId(Jwt principal) {
		return Long.valueOf(principal.getSubject());
	}

	/**
	 * 레이트 리밋 집계 키.
	 *
	 * <p>프록시 뒤에 놓이면 {@code getRemoteAddr()} 이 프록시 주소가 되어 모든 요청이 한 키로
	 * 묶인다. 그래서 {@code X-Forwarded-For} 의 <b>첫 번째</b> 항목을 먼저 본다 —
	 * 뒤쪽 항목은 중간 프록시가 덧붙인 것이고, 첫 항목만이 클라이언트가 주장하는 주소다.
	 * 이 값은 위조 가능하지만, 여기서 막으려는 것은 인증이 아니라 대량 자동 열거다.
	 */
	private String clientKey(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].strip();
		}
		return request.getRemoteAddr();
	}
}
