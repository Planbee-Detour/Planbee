package com.planbee.api.admin;

import jakarta.validation.Valid;

import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.planbee.api.admin.dto.PendingUserActionResult;
import com.planbee.api.admin.dto.PendingUserPage;
import com.planbee.api.admin.dto.ProcessedUserActionResult;
import com.planbee.api.admin.dto.ProcessedUserPage;
import com.planbee.api.admin.dto.RejectUserRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * 계약: docs/features/admin-user-approval/contract.yaml
 *
 * <p>컨트롤러는 바인딩과 위임만 한다 (S-5). <b>역할 검사도 여기 없다</b> —
 * {@code SecurityConfig} 가 {@code /api/v1/admin/**} 에 {@code ROLE_ADMIN} 을 걸어
 * 필터 체인에서 막고, 그 403 의 코드는 {@link AdminForbiddenCodeResolver} 가 정한다 (AC-3).
 *
 * <p>{@code @Parameter(schema = @Schema(...))} 에는 {@code type} 을 반드시 적는다 —
 * 비워 두면 springdoc 이 {@code type: string} 으로 내보내고 {@code default} 를 떨어뜨려
 * {@code make contract-check} 가 실패한다 (S-19, PlaceController 주석 참조).
 */
@Tag(name = "admin")
@RestController
@RequestMapping("/api/v1/admin/users")
public class AdminController {

	private static final String PAGE_SIZE_DESCRIPTION = """
			한 페이지 항목 수. 기본값 20. 앱은 이 값을 보내지 않고 기본값을 쓴다.
			범위를 벗어나면 400 이다 — 조용히 잘라내지 않는다.""";

	private static final String CURSOR_DESCRIPTION = """
			다음 페이지 커서. 직전 응답의 next_cursor 를 그대로 되돌려 보낸다.
			첫 페이지는 이 파라미터를 보내지 않는다. 앱은 값을 해석하지 않는다.""";

	private static final String USER_ID_DESCRIPTION = """
			대상 사용자 식별자. 목록 응답의 user_id 를 그대로 되돌려 보낸다.
			이메일을 경로에 싣지 않는다 — 개인정보가 URL·접근 로그·프록시 캐시에 남는다.""";

	private final AdminUserService adminUserService;

	public AdminController(AdminUserService adminUserService) {
		this.adminUserService = adminUserService;
	}

	@Operation(operationId = "listPendingUsers", summary = "검토 대기(`PENDING`) 목록")
	@ApiResponse(responseCode = "200", description = "조회 성공 (AC-5 · AC-6 · AC-7)")
	@SecurityRequirement(name = "bearerAuth")
	@GetMapping(path = "/pending", produces = MediaType.APPLICATION_JSON_VALUE)
	public PendingUserPage listPendingUsers(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = PAGE_SIZE_DESCRIPTION,
					schema = @Schema(type = "integer", minimum = "1", maximum = "50", defaultValue = "20"))
			@RequestParam(name = "page_size", required = false, defaultValue = "20") int pageSize,
			@Parameter(description = CURSOR_DESCRIPTION, schema = @Schema(type = "string", maxLength = 512))
			@RequestParam(name = "cursor", required = false) String cursor) {
		return adminUserService.listPending(userId(principal), pageSize, cursor);
	}

	@Operation(operationId = "listProcessedUsers",
			summary = "처리 완료(`APPROVED` · `SUSPENDED` · `REJECTED`) 목록")
	@ApiResponse(responseCode = "200", description = "조회 성공 (AC-20)")
	@SecurityRequirement(name = "bearerAuth")
	@GetMapping(path = "/processed", produces = MediaType.APPLICATION_JSON_VALUE)
	public ProcessedUserPage listProcessedUsers(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = PAGE_SIZE_DESCRIPTION,
					schema = @Schema(type = "integer", minimum = "1", maximum = "50", defaultValue = "20"))
			@RequestParam(name = "page_size", required = false, defaultValue = "20") int pageSize,
			@Parameter(description = CURSOR_DESCRIPTION, schema = @Schema(type = "string", maxLength = 512))
			@RequestParam(name = "cursor", required = false) String cursor) {
		return adminUserService.listProcessed(userId(principal), pageSize, cursor);
	}

	@Operation(operationId = "approveUser", summary = "가입 신청 승인 (`PENDING` → `APPROVED`)")
	@ApiResponse(responseCode = "200", description = "승인됨 (AC-10)")
	@SecurityRequirement(name = "bearerAuth")
	@PostMapping(path = "/{user_id}/approve", produces = MediaType.APPLICATION_JSON_VALUE)
	public ProcessedUserActionResult approveUser(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = USER_ID_DESCRIPTION) @PathVariable("user_id") Long targetUserId) {
		return adminUserService.approve(userId(principal), targetUserId);
	}

	/**
	 * 거절. <b>본문이 선택이다</b> (AC-17) — {@code @RequestBody(required = false)} 를 붙이면
	 * Spring 이 {@code consumes} 조건도 "본문 없는 요청" 에 한해 건너뛰므로,
	 * {@code Content-Type} 없이 본문 없이 와도 415 가 되지 않는다.
	 */
	@Operation(operationId = "rejectUser", summary = "가입 신청 거절 (`PENDING` → `REJECTED`)")
	@ApiResponse(responseCode = "200", description = "거절됨 (AC-15 · AC-17)")
	@SecurityRequirement(name = "bearerAuth")
	@PostMapping(path = "/{user_id}/reject", consumes = MediaType.APPLICATION_JSON_VALUE,
			produces = MediaType.APPLICATION_JSON_VALUE)
	public ProcessedUserActionResult rejectUser(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = USER_ID_DESCRIPTION) @PathVariable("user_id") Long targetUserId,
			@Valid @RequestBody(required = false) RejectUserRequest request) {
		return adminUserService.reject(userId(principal), targetUserId, request);
	}

	@Operation(operationId = "cancelUserRejection", summary = "거절 취소 (`REJECTED` → `PENDING`)")
	@ApiResponse(responseCode = "200", description = "검토 대기로 되돌렸다 (AC-19)")
	@SecurityRequirement(name = "bearerAuth")
	@PostMapping(path = "/{user_id}/reject/cancel", produces = MediaType.APPLICATION_JSON_VALUE)
	public PendingUserActionResult cancelUserRejection(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = USER_ID_DESCRIPTION) @PathVariable("user_id") Long targetUserId) {
		return adminUserService.cancelRejection(userId(principal), targetUserId);
	}

	@Operation(operationId = "suspendUser", summary = "이용 정지 (`APPROVED` → `SUSPENDED`)")
	@ApiResponse(responseCode = "200", description = "정지됨 (AC-21)")
	@SecurityRequirement(name = "bearerAuth")
	@PostMapping(path = "/{user_id}/suspend", produces = MediaType.APPLICATION_JSON_VALUE)
	public ProcessedUserActionResult suspendUser(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = USER_ID_DESCRIPTION) @PathVariable("user_id") Long targetUserId) {
		return adminUserService.suspend(userId(principal), targetUserId);
	}

	@Operation(operationId = "cancelUserSuspension", summary = "정지 해제 (`SUSPENDED` → `APPROVED`)")
	@ApiResponse(responseCode = "200", description = "정지가 해제됐다 (AC-24)")
	@SecurityRequirement(name = "bearerAuth")
	@PostMapping(path = "/{user_id}/suspend/cancel", produces = MediaType.APPLICATION_JSON_VALUE)
	public ProcessedUserActionResult cancelUserSuspension(
			@AuthenticationPrincipal Jwt principal,
			@Parameter(description = USER_ID_DESCRIPTION) @PathVariable("user_id") Long targetUserId) {
		return adminUserService.cancelSuspension(userId(principal), targetUserId);
	}

	/** JWT 의 {@code sub} 는 사용자 ID 다 ({@code TokenIssuer} 가 그렇게 발급한다). */
	private Long userId(Jwt principal) {
		return Long.valueOf(principal.getSubject());
	}
}
