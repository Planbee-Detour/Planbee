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

	public List<UserConsent> consents() {
		return List.copyOf(consents);
	}
}
