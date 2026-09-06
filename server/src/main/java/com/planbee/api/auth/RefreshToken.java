package com.planbee.api.auth;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * 리프레시 토큰. <b>평문은 저장하지 않는다</b> — SHA-256 해시만 남긴다 (S-17).
 *
 * <p>수명은 유휴 만료(sliding)다. 회전할 때마다 새 행이 새 14일을 받고, 절대 만료 상한은 없다
 * (2026-08-25 확정). 절대 만료를 두면 매일 쓰는 사용자도 2주마다 재로그인해야 한다.
 *
 * <p>한 행의 생애는 셋 중 하나로 끝난다.
 * <ul>
 *   <li>{@code rotatedAt} — 정상적으로 회전됨. 이후 이 토큰이 다시 오면 <b>재사용</b>이다 (AC-23).
 *       유예 창(AC-49)의 재시도 판정은 이 필드가 아니라 {@code RefreshTokenService} 의 응답 캐시가 한다 —
 *       판정 근거를 둘로 나누지 않는다 (2026-08-27 확정, defects.md D-3).</li>
 *   <li>{@code revokedAt} — 로그아웃(AC-26) 또는 재사용 감지로 인한 계정 전체 폐기(AC-24).</li>
 *   <li>{@code expiresAt} 경과 — 유휴 만료 (AC-25).</li>
 * </ul>
 */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Column(name = "token_hash", nullable = false, length = 64, unique = true)
	private String tokenHash;

	@Column(name = "issued_at", nullable = false)
	private Instant issuedAt;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "rotated_at")
	private Instant rotatedAt;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Enumerated(EnumType.STRING)
	@Column(name = "revoke_reason", length = 20)
	private RevokeReason revokeReason;

	protected RefreshToken() {
		// JPA
	}

	private RefreshToken(User user, String tokenHash, Instant issuedAt, Instant expiresAt) {
		this.user = user;
		this.tokenHash = tokenHash;
		this.issuedAt = issuedAt;
		this.expiresAt = expiresAt;
	}

	public static RefreshToken issue(User user, String tokenHash, Instant issuedAt, Instant expiresAt) {
		return new RefreshToken(user, tokenHash, issuedAt, expiresAt);
	}

	public void markRotated(Instant at) {
		this.rotatedAt = at;
	}

	public void revoke(Instant at, RevokeReason reason) {
		if (this.revokedAt == null) {
			this.revokedAt = at;
			this.revokeReason = reason;
		}
	}

	public RevokeReason revokeReason() {
		return revokeReason;
	}

	/**
	 * 폐기 사유. 앱이 띄우는 배너가 갈리므로 구분해서 남긴다 (design.md §4.3).
	 * 사유를 지우면 로그아웃한 기기에도 "보안을 위해 모든 기기에서 로그아웃했어요" 가 뜬다.
	 */
	public enum RevokeReason {

		/** 사용자가 그 기기에서 로그아웃했다 (AC-26). */
		LOGOUT,

		/** 회전된 토큰의 재사용이 감지되어 계정 전체가 폐기됐다 (AC-24). */
		REUSE_DETECTED
	}

	public boolean isRotated() {
		return rotatedAt != null;
	}

	public boolean isRevoked() {
		return revokedAt != null;
	}

	public boolean isExpired(Instant now) {
		return !now.isBefore(expiresAt);
	}

	public Long id() {
		return id;
	}

	public User user() {
		return user;
	}

	public String tokenHash() {
		return tokenHash;
	}
}
