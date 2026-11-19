package app.ink.api.client;

import java.util.Objects;
import java.util.UUID;

import app.ink.api.common.SyncedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * A client. The display fields are kept as entered; {@code searchName}, {@code phoneDigits} and
 * {@code instagramNorm} are their {@link ClientSearch} forms, recomputed on every {@link #set}.
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

	protected Client() {
	}

	Client(UUID id, String name, String phone, String email, String instagram, String notes) {
		super(id);
		set(name, phone, email, instagram, notes);
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

}
