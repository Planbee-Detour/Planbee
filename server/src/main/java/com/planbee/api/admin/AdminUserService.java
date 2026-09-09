package com.planbee.api.admin;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.planbee.api.admin.dto.PendingUserActionResult;
import com.planbee.api.admin.dto.PendingUserItem;
import com.planbee.api.admin.dto.PendingUserPage;
import com.planbee.api.admin.dto.PendingUserRow;
import com.planbee.api.admin.dto.ProcessedStatus;
import com.planbee.api.admin.dto.ProcessedUserActionResult;
import com.planbee.api.admin.dto.ProcessedUserItem;
import com.planbee.api.admin.dto.ProcessedUserPage;
import com.planbee.api.admin.dto.ProcessedUserRow;
import com.planbee.api.admin.dto.RejectUserRequest;
import com.planbee.api.auth.PendingApprovalCounter;
import com.planbee.api.auth.User;
import com.planbee.api.auth.UserRepository;
import com.planbee.api.auth.UserStatus;
import com.planbee.api.common.error.BusinessException;
import com.planbee.api.common.error.CommonErrorCode;
import com.planbee.api.common.error.FieldErrorDetail;

/**
 * 가입 신청 검토 · 승인 · 거절 · 이용 정지. 계약: docs/features/admin-user-approval/contract.yaml
 *
 * <p><b>역할 검사는 여기 없다.</b> {@code SecurityConfig} 가 {@code /api/v1/admin/**} 에
 * {@code ROLE_ADMIN} 을 걸어 필터 체인에서 막는다 (AC-3). 방어선이 컨트롤러보다 앞에 있어야
 * 엔드포인트가 하나 늘 때 검사를 빠뜨려도 막힌다.
 *
 * <p>상태 전이는 다섯이고 <b>각각 전제 상태가 하나씩</b>이다. 그것과 다르면 전부 같은 코드
 * ({@code ADMIN_USER_ALREADY_PROCESSED})로 409 다 — 대개 다른 기기가 먼저 처리한 경우다 (AC-12).
 */
@Service
public class AdminUserService {

	/**
	 * 가입 사유가 비어 있을 때 그 자리에 넣는 문구 (AC-33).
	 *
	 * <p><b>이 문자열이 앱 코드에 나타나면 위반이다.</b> 서버가 완성해서 내리기로 확정했고
	 * (design.md §9.7 / C-8), 그래서 앱에는 {@code null} 검사도 기본값 상수도 없다.
	 */
	private static final String SIGNUP_REASON_ABSENT = "입력하지 않음";

	private static final int MIN_PAGE_SIZE = 1;
	private static final int MAX_PAGE_SIZE = 50;
	private static final String PAGE_SIZE_FIELD = "page_size";

	private final UserRepository userRepository;
	private final AdminUserRepository adminUserRepository;
	private final AdminActionLogRepository actionLogRepository;
	private final PendingApprovalCounter pendingApprovalCounter;
	private final Clock clock;

	public AdminUserService(
			UserRepository userRepository,
			AdminUserRepository adminUserRepository,
			AdminActionLogRepository actionLogRepository,
			PendingApprovalCounter pendingApprovalCounter,
			Clock clock) {
		this.userRepository = userRepository;
		this.adminUserRepository = adminUserRepository;
		this.actionLogRepository = actionLogRepository;
		this.pendingApprovalCounter = pendingApprovalCounter;
		this.clock = clock;
	}

	// ─────────────────────────────────────────────────────────────────
	// 목록
	// ─────────────────────────────────────────────────────────────────

	/** 검토 대기 목록 (AC-5 · AC-6 · AC-7). 빈 목록은 오류가 아니라 정상 200 이다. */
	@Transactional(readOnly = true)
	public PendingUserPage listPending(Long actorUserId, int pageSize, String cursor) {
		validatePageSize(pageSize);

		List<PendingUserRow> rows = adminUserRepository.findPendingPage(UserCursor.decode(cursor), pageSize + 1);
		boolean hasNext = rows.size() > pageSize;
		List<PendingUserRow> page = hasNext ? rows.subList(0, pageSize) : rows;

		List<PendingUserItem> items = page.stream()
				.map(row -> toPendingItem(row, actorUserId))
				.toList();
		String nextCursor = hasNext ? nextCursor(lastOf(page).requestedAt(), lastOf(page).userId()) : null;

		return new PendingUserPage(items, hasNext, nextCursor, pendingApprovalCounter.countPending());
	}

	/** 처리 완료 목록 (AC-20). 세 상태가 섞이고 관리자 자기 계정도 포함된다. */
	@Transactional(readOnly = true)
	public ProcessedUserPage listProcessed(Long actorUserId, int pageSize, String cursor) {
		validatePageSize(pageSize);

		List<ProcessedUserRow> rows = adminUserRepository.findProcessedPage(UserCursor.decode(cursor), pageSize + 1);
		boolean hasNext = rows.size() > pageSize;
		List<ProcessedUserRow> page = hasNext ? rows.subList(0, pageSize) : rows;

		List<ProcessedUserItem> items = page.stream()
				.map(row -> toProcessedItem(row, actorUserId))
				.toList();
		String nextCursor = hasNext ? nextCursor(lastOf(page).processedAt(), lastOf(page).userId()) : null;

		return new ProcessedUserPage(items, hasNext, nextCursor, pendingApprovalCounter.countPending());
	}

	// ─────────────────────────────────────────────────────────────────
	// 상태 전이
	// ─────────────────────────────────────────────────────────────────

	/** 승인 (AC-10). 전제 상태는 {@code PENDING} 하나다. */
	@Transactional
	public ProcessedUserActionResult approve(Long actorUserId, Long targetUserId) {
		User target = requireUser(targetUserId);
		requireStatus(target, UserStatus.PENDING);

		Instant now = clock.instant();
		target.approve(now);
		writeActionLog(actorUserId, targetUserId, AdminAction.APPROVE, now);

		return processedResult(target, actorUserId);
	}

	/**
	 * 거절 (AC-15 · AC-17). 전제 상태는 {@code PENDING} 하나다.
	 *
	 * <p>사유는 선택이고 본문 자체를 생략해도 된다. 길이 제약(200자)은 요청 DTO 의
	 * Bean Validation 이 강제하고 실패하면 {@code VALIDATION_FAILED} +
	 * {@code errors[].field = "rejection_reason"} 으로 나간다 (AC-16).
	 */
	@Transactional
	public ProcessedUserActionResult reject(Long actorUserId, Long targetUserId, RejectUserRequest request) {
		User target = requireUser(targetUserId);
		requireStatus(target, UserStatus.PENDING);

		Instant now = clock.instant();
		target.reject(blankToNull(request == null ? null : request.rejectionReason()), now);
		writeActionLog(actorUserId, targetUserId, AdminAction.REJECT, now);

		return processedResult(target, actorUserId);
	}

	/**
	 * 거절 취소 (AC-19). 전제 상태는 {@code REJECTED} 하나다.
	 *
	 * <p>이 계약에서 처리 완료 → 검토 대기 방향은 이것 하나뿐이라 결과가
	 * {@link PendingUserActionResult} 다. 신청 시각은 바뀌지 않고 저장된 거절 사유는 비운다.
	 */
	@Transactional
	public PendingUserActionResult cancelRejection(Long actorUserId, Long targetUserId) {
		User target = requireUser(targetUserId);
		requireStatus(target, UserStatus.REJECTED);

		Instant now = clock.instant();
		target.cancelRejection(now);
		writeActionLog(actorUserId, targetUserId, AdminAction.CANCEL_REJECTION, now);

		userRepository.flush();
		return new PendingUserActionResult(pendingApprovalCounter.countPending(), toPendingItem(target, actorUserId));
	}

	/**
	 * 이용 정지 (AC-21). 전제 상태는 {@code APPROVED} 하나다.
	 *
	 * <p><b>자기 자신은 정지할 수 없다</b> (AC-25). 앱이 버튼을 숨기는 것은 편의일 뿐이고
	 * 차단의 주체는 서버다. 그래서 상태 확인보다 먼저 본다 — 자기 계정이면 그 계정이 어떤
	 * 상태든 거절돼야 한다.
	 *
	 * <p><b>리프레시 토큰을 폐기하지 않는다.</b> 폐기하면 갱신이 401 이 되어 앱이 "세션이
	 * 만료됐어요" 를 띄우고 사용자는 정지된 사실을 알 수 없다. 폐기하지 않아야 갱신이
	 * 403 + {@code account_status}(SUSPENDED) 로 나가 정확한 안내가 뜬다 (AC-22 · AC-23).
	 * 매 요청 상태 확인도 도입하지 않는다 — 반영은 갱신 시점이고 최대 지연은 액세스 토큰
	 * 수명(30분)이다 (2026-09-07 확정 / S-17).
	 */
	@Transactional
	public ProcessedUserActionResult suspend(Long actorUserId, Long targetUserId) {
		if (actorUserId.equals(targetUserId)) {
			throw new BusinessException(AdminErrorCode.SELF_SUSPEND_FORBIDDEN);
		}
		User target = requireUser(targetUserId);
		requireStatus(target, UserStatus.APPROVED);

		Instant now = clock.instant();
		target.suspend(now);
		writeActionLog(actorUserId, targetUserId, AdminAction.SUSPEND, now);

		return processedResult(target, actorUserId);
	}

	/**
	 * 정지 해제 (AC-24). 전제 상태는 {@code SUSPENDED} 하나다.
	 * <b>승인 시각을 이 시각으로 갱신한다</b> — 그러지 않으면 목록 행과 상세 시트가 서로 다른
	 * 날짜를 말한다 (design.md §5.4).
	 */
	@Transactional
	public ProcessedUserActionResult cancelSuspension(Long actorUserId, Long targetUserId) {
		User target = requireUser(targetUserId);
		requireStatus(target, UserStatus.SUSPENDED);

		Instant now = clock.instant();
		target.cancelSuspension(now);
		writeActionLog(actorUserId, targetUserId, AdminAction.CANCEL_SUSPENSION, now);

		return processedResult(target, actorUserId);
	}

	// ─────────────────────────────────────────────────────────────────
	// 조립
	// ─────────────────────────────────────────────────────────────────

	/**
	 * 상태 전이 응답.
	 *
	 * <p>건수를 세기 전에 {@code flush} 한다. 방금 바꾼 상태가 아직 DB 에 반영되지 않은 채로
	 * 세면 "처리 직후의 건수"(AC-32)가 한 건 어긋난다. 자동 플러시에 기대지 않고 명시한다.
	 */
	private ProcessedUserActionResult processedResult(User target, Long actorUserId) {
		userRepository.flush();
		return new ProcessedUserActionResult(pendingApprovalCounter.countPending(), toProcessedItem(target, actorUserId));
	}

	private PendingUserItem toPendingItem(PendingUserRow row, Long actorUserId) {
		return new PendingUserItem(
				row.userId(),
				row.email(),
				signupReasonText(row.signupReason()),
				row.requestedAt(),
				row.userId().equals(actorUserId));
	}

	private PendingUserItem toPendingItem(User user, Long actorUserId) {
		return new PendingUserItem(
				user.id(),
				user.email(),
				signupReasonText(user.signupReason()),
				user.createdAt(),
				user.id().equals(actorUserId));
	}

	private ProcessedUserItem toProcessedItem(ProcessedUserRow row, Long actorUserId) {
		ProcessedStatus status = ProcessedStatus.from(row.status());
		return new ProcessedUserItem(
				row.userId(),
				row.email(),
				status,
				status.label(),
				row.processedAt(),
				status.prefix(),
				row.approvedAt(),
				row.suspendedAt(),
				row.rejectedAt(),
				row.userId().equals(actorUserId));
	}

	private ProcessedUserItem toProcessedItem(User user, Long actorUserId) {
		ProcessedStatus status = ProcessedStatus.from(user.status());
		return new ProcessedUserItem(
				user.id(),
				user.email(),
				status,
				status.label(),
				user.processedAt(),
				status.prefix(),
				user.approvedAt(),
				user.suspendedAt(),
				user.rejectedAt(),
				user.id().equals(actorUserId));
	}

	/** 비어 있으면 대체 문구를 채운다. 절대 {@code null} 을 내리지 않는다 (AC-33). */
	private String signupReasonText(String signupReason) {
		return signupReason == null || signupReason.isBlank() ? SIGNUP_REASON_ABSENT : signupReason;
	}

	private String nextCursor(Instant sortKey, Long userId) {
		return new UserCursor(sortKey, userId).encode();
	}

	private <T> T lastOf(List<T> page) {
		return page.get(page.size() - 1);
	}

	// ─────────────────────────────────────────────────────────────────
	// 확인
	// ─────────────────────────────────────────────────────────────────

	/**
	 * 대상 조회. 없으면 404 다 — 처리하는 사이에 그 계정이 삭제된 경우다 (auth 의 계정 삭제는
	 * 즉시 파기다). "이미 처리됨"(409)과 사실이 다르므로 같은 코드로 뭉뚱그리지 않는다.
	 */
	private User requireUser(Long targetUserId) {
		return userRepository.findById(targetUserId)
				.orElseThrow(() -> new BusinessException(CommonErrorCode.NOT_FOUND, "대상을 찾을 수 없어요."));
	}

	/** 전제 상태 확인 (AC-12). 다섯 전이가 이 한 코드를 공유한다. */
	private void requireStatus(User target, UserStatus expected) {
		if (target.status() != expected) {
			throw new BusinessException(AdminErrorCode.USER_ALREADY_PROCESSED);
		}
	}

	/**
	 * 페이지 크기 확인. <b>범위를 벗어나면 조용히 잘라내지 않고 400 이다</b> —
	 * 잘라내면 앱은 51건을 요청하고 50건을 받은 사실을 모른 채 목록이 어긋난다.
	 */
	private void validatePageSize(int pageSize) {
		if (pageSize < MIN_PAGE_SIZE || pageSize > MAX_PAGE_SIZE) {
			throw new BusinessException(CommonErrorCode.VALIDATION_FAILED)
					.withExtension("errors", List.of(new FieldErrorDetail(
							PAGE_SIZE_FIELD, "RANGE",
							"%d~%d 사이여야 해요".formatted(MIN_PAGE_SIZE, MAX_PAGE_SIZE))));
		}
	}

	private void writeActionLog(Long actorUserId, Long targetUserId, AdminAction action, Instant now) {
		actionLogRepository.save(AdminActionLog.record(actorUserId, targetUserId, action, now));
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}
}
