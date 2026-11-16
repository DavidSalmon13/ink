plugins {
	java
	id("org.springframework.boot") version "3.5.3"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "app.ink"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

// Boot 3.5.3 manages Testcontainers 1.21.2, which speaks a Docker API version that Docker Engine 29+
// rejects ("Could not find a valid Docker environment", HTTP 400). 1.21.4 negotiates a supported one.
extra["testcontainers.version"] = "1.21.4"

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.flywaydb:flyway-core")
	implementation("org.flywaydb:flyway-database-postgresql")
	runtimeOnly("org.postgresql:postgresql")

	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:junit-jupiter")
	testImplementation("org.testcontainers:postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// Prints the bcrypt hash for OWNER_PASSWORD_HASH. Reads the password from stdin, never from args,
// so it stays out of shell history: ./gradlew -q hashPassword
tasks.register<JavaExec>("hashPassword") {
	group = "application"
	description = "Reads a password from stdin and prints its bcrypt hash (for OWNER_PASSWORD_HASH)."
	classpath = sourceSets["main"].runtimeClasspath
	mainClass = "app.ink.api.auth.HashPasswordCli"
	standardInput = System.`in`
}
