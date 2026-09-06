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
 * 동의 이력 한 건 (AC-8).
 *
 * <p><b>거부한 항목도 남긴다.</b> {@code agreed = false} 행이 없으면 "동의를 받은 적이 없다" 와
 * "거부했다" 를 구분할 수 없다. {@code MARKETING} 은 정보통신망법상 광고성 정보를 보낼 때
 * 동의 여부와 시각을 증빙해야 하므로 특히 그렇다.
 */
@Entity
@Table(name = "user_consents")
public class UserConsent {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	@Enumerated(EnumType.STRING)
	@Column(name = "consent_type", nullable = false, length = 20)
	private ConsentType consentType;

	@Column(nullable = false)
	private boolean agreed;

	/** 동의한 문서의 버전. {@code MARKETING} 은 대응 문서가 없어 비어 있을 수 있다. */
	@Column(name = "document_version", length = 20)
	private String documentVersion;

	@Column(name = "agreed_at", nullable = false)
	private Instant agreedAt;

	protected UserConsent() {
		// JPA
	}

	private UserConsent(ConsentType consentType, boolean agreed, String documentVersion, Instant agreedAt) {
		this.consentType = consentType;
		this.agreed = agreed;
		this.documentVersion = documentVersion;
		this.agreedAt = agreedAt;
	}

	/**
	 * 동의 시각은 <b>요청이 정하지 않는다.</b> 서버가 주입받은 {@code Clock} 으로 찍는다 (S-8) —
	 * 클라이언트가 보낸 시각을 그대로 저장하면 증빙으로서의 값이 없다.
	 */
	public static UserConsent record(ConsentType type, boolean agreed, String documentVersion, Instant agreedAt) {
		return new UserConsent(type, agreed, documentVersion, agreedAt);
	}

	void assignTo(User owner) {
		this.user = owner;
	}

	public ConsentType consentType() {
		return consentType;
	}

	public boolean agreed() {
		return agreed;
	}

	public String documentVersion() {
		return documentVersion;
	}

	public Instant agreedAt() {
		return agreedAt;
	}
}
