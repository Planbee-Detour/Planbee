package com.planbee.api.admin;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * "누가 언제 무엇을 처리했는가" (AC-13). 스키마는
 * {@code db/migration/V3__create_admin_user_approval.sql} 이 소유한다 (S-14).
 *
 * <p><b>응답에 나가지 않는다.</b> 사용자 상세 시트에 처리 기록을 그리지 않기로 확정됐고
 * (2026-09-07 Q2 / design.md §7.1.1) 그래서 계약에도 처리자 필드가 없다. 이 테이블의 용도는
 * 화면이 아니라 사후 확인이다.
 *
 * <p><b>{@code users} 로의 연관을 만들지 않는다.</b> 계정 삭제가 즉시 파기라(auth AC-31)
 * 연관을 걸면 기록이 계정과 함께 사라지거나 삭제가 막힌다. 식별자만 값으로 들고 있고,
 * 이메일 같은 개인정보는 담지 않는다.
 */
@Entity
@Table(name = "admin_action_logs")
public class AdminActionLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "actor_user_id", nullable = false)
	private Long actorUserId;

	@Column(name = "target_user_id", nullable = false)
	private Long targetUserId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private AdminAction action;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	protected AdminActionLog() {
		// JPA
	}

	private AdminActionLog(Long actorUserId, Long targetUserId, AdminAction action, Instant createdAt) {
		this.actorUserId = actorUserId;
		this.targetUserId = targetUserId;
		this.action = action;
		this.createdAt = createdAt;
	}

	public static AdminActionLog record(Long actorUserId, Long targetUserId, AdminAction action, Instant now) {
		return new AdminActionLog(actorUserId, targetUserId, action, now);
	}

	public Long id() {
		return id;
	}

	public Long actorUserId() {
		return actorUserId;
	}

	public Long targetUserId() {
		return targetUserId;
	}

	public AdminAction action() {
		return action;
	}

	public Instant createdAt() {
		return createdAt;
	}
}
