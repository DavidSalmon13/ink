# API image for Railway (deploy-pipeline). Build context: apps/api.
#   docker build -t ink-api apps/api
#   docker run --rm -p 8080:8080 -e DB_URL=... -e DB_USER=... -e DB_PASSWORD=... ink-api

# --- Build: the repo's Gradle wrapper on a Java 21 JDK (same Gradle version as local and CI).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
# Wrapper and build scripts first, so the dependency download is cached until they change.
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies > /dev/null
COPY src src
# Tests run in CI (Testcontainers needs Docker); Railway waits for CI before deploying.
RUN ./gradlew --no-daemon bootJar -x test \
 && cp build/libs/*-SNAPSHOT.jar /src/app.jar

# --- Run: JRE only, as a non-root user.
FROM eclipse-temurin:21-jre
RUN groupadd --system ink && useradd --system --gid ink --no-create-home ink
WORKDIR /app
COPY --from=build /src/app.jar app.jar
USER ink
# Railway injects PORT; 8080 locally. Container-aware heap sizing.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar app.jar"]
