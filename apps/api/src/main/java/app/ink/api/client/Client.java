package app.ink.api.client;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Objects;
import java.util.UUID;

import app.ink.api.common.SyncedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

/**
 * A client. The display fields are kept as entered; {@code searchName}, {@code phoneDigits} and
 * {@code instagramNorm} are their {@link ClientSearch} forms, recomputed on every {@link #set}.
 * {@code marketingConsent} / {@code consentUpdatedAt} cache the latest {@link ConsentEvent} and change only
 * through {@link #changeConsent}; {@code unsubscribeToken} is never exposed (marketing-consent AC1).
 */
@Entity
@Table(name = "client")
public class Client extends SyncedEntity {

	@Column(nullable = false)
	private String name;

	private String phone;

	private String email;

	private String instagram;

	private String notes;

	@Column(name = "search_name", nullable = false)
	private String searchName;

	@Column(name = "phone_digits")
	private String phoneDigits;

	@Column(name = "instagram_norm")
	private String instagramNorm;

	@Enumerated(EnumType.STRING)
	@Column(name = "marketing_consent", nullable = false)
	private MarketingConsent marketingConsent = MarketingConsent.none;

	@Column(name = "consent_updated_at")
	private Instant consentUpdatedAt;

	@Column(name = "unsubscribe_token", nullable = false, unique = true, updatable = false)
	private String unsubscribeToken;

	private static final SecureRandom RANDOM = new SecureRandom();

	protected Client() {
	}

	Client(UUID id, String name, String phone, String email, String instagram, String notes) {
		super(id);
		set(name, phone, email, instagram, notes);
		this.unsubscribeToken = newUnsubscribeToken();
	}

	/** 32 random bytes, base64url without padding (43 characters). */
	private static String newUnsubscribeToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	/**
	 * Applies a consent action at {@code now} (microsecond precision, like the other timestamps) and
	 * returns the event to append, or null when the client is already in that state (AC3: retry-safe).
	 */
	ConsentEvent changeConsent(ConsentAction action, Instant now) {
		if (marketingConsent == action.state()) {
			return null;
		}
		Instant at = now.truncatedTo(ChronoUnit.MICROS);
		this.marketingConsent = action.state();
		this.consentUpdatedAt = at;
		return new ConsentEvent(getId(), action, ConsentSource.app, at);
	}

	boolean sameAs(String name, String phone, String email, String instagram, String notes) {
		return Objects.equals(this.name, name) && Objects.equals(this.phone, phone)
				&& Objects.equals(this.email, email) && Objects.equals(this.instagram, instagram)
				&& Objects.equals(this.notes, notes);
	}

	void set(String name, String phone, String email, String instagram, String notes) {
		this.name = name;
		this.phone = phone;
		this.email = email;
		this.instagram = instagram;
		this.notes = notes;
		this.searchName = ClientSearch.name(name);
		this.phoneDigits = ClientSearch.phoneDigits(phone);
		this.instagramNorm = ClientSearch.instagram(instagram);
	}

	public String getName() {
		return name;
	}

	public String getPhone() {
		return phone;
	}

	public String getEmail() {
		return email;
	}

	public String getInstagram() {
		return instagram;
	}

	public String getNotes() {
		return notes;
	}

	public MarketingConsent getMarketingConsent() {
		return marketingConsent;
	}

	public Instant getConsentUpdatedAt() {
		return consentUpdatedAt;
	}

}
