package com.planbee.api.auth;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

/**
 * 사용자 계정. 스키마는 {@code db/migration/V2__create_auth.sql} 이 소유한다 (S-14).
 *
 * <p>엔티티는 리포지토리 밖으로 나가지 않는다 — 컨트롤러가 주고받는 것은 {@code dto/} 의 record 다 (S-4).
 */
@Entity
@Table(name = "users")
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	/** 정규화(소문자·앞뒤 공백 제거)된 값만 들어온다. {@link #normalizeEmail} 참조. */
	@Column(nullable = false, length = 255, unique = true)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 255)
	private String passwordHash;

	/** 선택 항목. 비어 있어도 가입 신청이 접수된다 (AC-1·AC-6). */
	@Column(name = "signup_reason", length = 100)
	private String signupReason;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserStatus status;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private UserRole role;

	/** 만 14세 이상 자기 확인 시각. 동의 이력이 아니다 (design.md §5.4). */
	@Column(name = "age_over_14_confirmed_at", nullable = false)
	private Instant ageOver14ConfirmedAt;

	/**
	 * 승인 시각 (admin-user-approval AC-10 · AC-24). <b>정지 해제가 이 값을 갱신한다</b> —
	 * 목록 행("승인 …")과 상세 시트("승인 시각 …")가 서로 다른 날짜를 말하지 않게 하기 위해서다
	 * (계약 {@code POST /api/v1/admin/users/{user_id}/suspend/cancel}).
	 */
	@Column(name = "approved_at")
	private Instant approvedAt;

	/** 정지 시각. {@code SUSPENDED} 일 때만 값이 있다 — 정지 해제가 비운다. */
	@Column(name = "suspended_at")
	private Instant suspendedAt;

	/** 거절 시각. {@code REJECTED} 일 때만 값이 있다 — 거절 취소가 비운다. */
	@Column(name = "rejected_at")
	private Instant rejectedAt;

	/**
	 * 마지막으로 상태가 바뀐 시각. 처리 완료 목록의 정렬 키이자 커서 키다.
	 * {@code PENDING} 은 아직 처리되지 않았으므로 {@code null} 이다.
	 */
	@Column(name = "processed_at")
	private Instant processedAt;

	/**
	 * 거절 사유 (선택, 최대 200자). <b>저장만 하고 어떤 응답에도 싣지 않는다</b> —
	 * 사용자에게도 관리자에게도 표시하지 않기로 확정됐다 (계약 {@code RejectUserRequest}).
	 * 거절 취소 시 비운다.
	 */
	@Column(name = "rejection_reason", length = 200)
	private String rejectionReason;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt;

	/**
	 * 동의 이력. 계정 삭제는 즉시 파기이므로 동의 이력도 함께 지운다 (PRD 제약).
	 * DB 쪽에도 {@code ON DELETE CASCADE} 가 걸려 있어 어느 경로로 지워도 남지 않는다.
	 */
	@OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<UserConsent> consents = new ArrayList<>();

	protected User() {
		// JPA
	}

	private User(
			String email,
			String passwordHash,
			String signupReason,
			Instant ageOver14ConfirmedAt,
			Instant now) {
		this.email = email;
		this.passwordHash = passwordHash;
		this.signupReason = signupReason;
		this.status = UserStatus.PENDING;
		this.role = UserRole.USER;
		this.ageOver14ConfirmedAt = ageOver14ConfirmedAt;
		this.createdAt = now;
		this.updatedAt = now;
	}

	/**
	 * 가입 신청으로 계정을 만든다. <b>상태는 항상 {@code PENDING} 이고 역할은 항상 {@code USER} 다</b> —
	 * 요청 값으로 정하지 않는다. 요청이 상태나 역할을 지정할 수 있으면 승인 게이트 자체가 무의미해진다.
	 */
	public static User register(
			String normalizedEmail,
			String passwordHash,
			String signupReason,
			Instant now) {
		return new User(normalizedEmail, passwordHash, signupReason, now, now);
	}

	/**
	 * 이메일 정규화. 저장·조회·로그인 실패 카운터가 <b>모두 같은 형태</b>를 써야 한다.
	 * 한 곳이라도 어긋나면 대소문자만 바꾼 이메일로 중복 가입되거나(AC-2 우회),
	 * 잠금 카운터를 우회할 수 있다(AC-47 우회).
	 */
	public static String normalizeEmail(String rawEmail) {
		return rawEmail == null ? null : rawEmail.strip().toLowerCase(java.util.Locale.ROOT);
	}

	public void addConsent(UserConsent consent) {
		consents.add(consent);
		consent.assignTo(this);
	}

	/**
	 * 가입 신청 승인 ({@code PENDING} → {@code APPROVED}, AC-10).
	 *
	 * <p>전이 가능 여부는 호출자가 먼저 확인한다 — 그 판정은 오류 코드
	 * ({@code ADMIN_USER_ALREADY_PROCESSED})와 짝이라 admin 도메인의 몫이다.
	 * 엔티티는 "바뀌면 어떤 값이 되는가" 만 안다.
	 */
	public void approve(Instant now) {
		this.status = UserStatus.APPROVED;
		this.approvedAt = now;
		this.suspendedAt = null;
		this.rejectedAt = null;
		this.rejectionReason = null;
		touchProcessed(now);
	}

	/** 가입 신청 거절 ({@code PENDING} → {@code REJECTED}, AC-15). 사유는 선택이다 (AC-17). */
	public void reject(String reason, Instant now) {
		this.status = UserStatus.REJECTED;
		this.rejectedAt = now;
		this.rejectionReason = reason;
		this.approvedAt = null;
		this.suspendedAt = null;
		touchProcessed(now);
	}

	/**
	 * 거절 취소 ({@code REJECTED} → {@code PENDING}, AC-19).
	 *
	 * <p>{@code createdAt}(= 신청 시각)은 건드리지 않는다 — 원래 자리로 돌아가야 한다
	 * (design.md §7.5). 저장된 거절 사유는 비운다.
	 */
	public void cancelRejection(Instant now) {
		this.status = UserStatus.PENDING;
		this.rejectedAt = null;
		this.rejectionReason = null;
		this.processedAt = null;
		this.updatedAt = now;
	}

	/** 이용 정지 ({@code APPROVED} → {@code SUSPENDED}, AC-21). 사유를 받지 않는다. */
	public void suspend(Instant now) {
		this.status = UserStatus.SUSPENDED;
		this.suspendedAt = now;
		touchProcessed(now);
	}

	/**
	 * 정지 해제 ({@code SUSPENDED} → {@code APPROVED}, AC-24).
	 * <b>승인 시각을 이 시각으로 갱신한다</b> — 근거는 {@link #approvedAt} 의 설명에 있다.
	 */
	public void cancelSuspension(Instant now) {
		this.status = UserStatus.APPROVED;
		this.approvedAt = now;
		this.suspendedAt = null;
		touchProcessed(now);
	}

	private void touchProcessed(Instant now) {
		this.processedAt = now;
		this.updatedAt = now;
	}

	public Long id() {
		return id;
	}

	public String email() {
		return email;
	}

	public String passwordHash() {
		return passwordHash;
	}

	public String signupReason() {
		return signupReason;
	}

	public UserStatus status() {
		return status;
	}

	public UserRole role() {
		return role;
	}

	public Instant createdAt() {
		return createdAt;
	}

	public Instant approvedAt() {
		return approvedAt;
	}

	public Instant suspendedAt() {
		return suspendedAt;
	}

	public Instant rejectedAt() {
		return rejectedAt;
	}

	public Instant processedAt() {
		return processedAt;
	}

	public List<UserConsent> consents() {
		return List.copyOf(consents);
	}
}
