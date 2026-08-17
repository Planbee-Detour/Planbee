# 통합 테스트용 API 이미지. 운영 배포용으로 쓰기 전에 JVM 옵션과 비루트 사용자를 재검토할 것.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# 의존성 레이어를 소스보다 먼저 캐싱한다.
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN ./gradlew --no-daemon dependencies --quiet || true

COPY src src
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app

# 헬스체크용
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

RUN useradd --system --create-home planbee
USER planbee

COPY --from=build /workspace/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
