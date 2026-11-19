// covers AC5, T1
package app.ink.api.client;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ClientSearchTest {

	// ---- name ----------------------------------------------------------------------------------

	@Test
	void nameMapsHebrewFinalLettersToRegularForms() {
		assertThat(ClientSearch.name("ךםןףץ")).isEqualTo("כמנפצ");
		// "דן" typed with a final nun must match inside "דנה"
		assertThat(ClientSearch.name("דנה")).contains(ClientSearch.name("דן"));
	}

	@Test
	void nameRemovesNiqqud() {
		assertThat(ClientSearch.name("דָּנָה")).isEqualTo("דנה");
		assertThat(ClientSearch.name("מִרְיָם")).isEqualTo("מרימ");
	}

	@Test
	void nameIsCaseInsensitiveAndCollapsesSpaces() {
		assertThat(ClientSearch.name("  Maya   LEVI ")).isEqualTo("maya levi");
		assertThat(ClientSearch.name("נועה  ברק")).isEqualTo("נועה ברק");
	}

	// ---- phone ---------------------------------------------------------------------------------

	@Test
	void phoneFormatsNormalizeToTheSameDigits() {
		assertThat(ClientSearch.phoneDigits("054-381-2290")).isEqualTo("0543812290");
		assertThat(ClientSearch.phoneDigits("+972 54 381 2290")).isEqualTo("0543812290");
		assertThat(ClientSearch.phoneDigits("972543812290")).isEqualTo("0543812290");
		assertThat(ClientSearch.phoneDigits("(03) 555-1234")).isEqualTo("035551234");
	}

	@Test
	void phoneWithoutDigitsIsNull() {
		assertThat(ClientSearch.phoneDigits(null)).isNull();
		assertThat(ClientSearch.phoneDigits("  ")).isNull();
		assertThat(ClientSearch.phoneDigits("abc")).isNull();
	}

	@Test
	void phoneQueryNeedsAtLeastThreeDigits() {
		assertThat(ClientSearch.phoneQuery("054")).isEqualTo("054");
		assertThat(ClientSearch.phoneQuery("054-381")).isEqualTo("054381");
		assertThat(ClientSearch.phoneQuery("+972 54")).isEqualTo("054");
		assertThat(ClientSearch.phoneQuery("38")).isNull();
		assertThat(ClientSearch.phoneQuery("מאיה")).isNull();
	}

	// ---- instagram -----------------------------------------------------------------------------

	@Test
	void instagramIsLowercasedWithoutLeadingAt() {
		assertThat(ClientSearch.instagram("@Maya.Lines")).isEqualTo("maya.lines");
		assertThat(ClientSearch.instagram(" maya_ink ")).isEqualTo("maya_ink");
	}

	@Test
	void blankInstagramIsNull() {
		assertThat(ClientSearch.instagram(null)).isNull();
		assertThat(ClientSearch.instagram(" ")).isNull();
		assertThat(ClientSearch.instagram("@")).isNull();
	}
}
