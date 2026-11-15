plugins {
	// Lets Gradle auto-provision the Java 21 toolchain (only a newer JDK may be installed locally; CI uses Temurin 21).
	id("org.gradle.toolchains.foojay-resolver-convention") version "0.8.0"
}

rootProject.name = "api"
