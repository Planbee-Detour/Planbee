# Planbee

Planbee는 iOS를 우선 지원하는 React Native 앱과 Java Spring Boot API를 한 저장소에서 관리하는 프로젝트입니다.

## 기술 스택

- Mobile: React Native 0.86.0, React 19.2, TypeScript, iOS 우선
- API: Java 21, Spring Boot 3.5.16, Gradle
- Database: 미정 (현재 DB 의존성 없음)

## 구조

```text
Planbee/
├── mobile/   # React Native 앱
└── server/   # Spring Boot REST API
```

## 사전 준비

- Node.js 22 (`nvm use`)
- JDK 21 이상
- Xcode 16 이상
- CocoaPods

## 시작하기

### API 서버

```bash
npm run server:start
```

상태 확인: `http://localhost:8080/api/v1/health`

### iOS 앱

첫 실행에만 의존성과 CocoaPods를 설치합니다.

```bash
nvm use
npm run mobile:install
cd mobile
bundle install
cd ios && bundle exec pod install && cd ../..
npm run mobile:ios
```

iOS 시뮬레이터에서는 `localhost:8080`으로 로컬 API에 연결합니다. 실제 iPhone에서는 `mobile/App.tsx`의 `API_BASE_URL`을 Mac의 같은 네트워크 IP로 변경해야 합니다.

## 검사

```bash
npm run mobile:lint
npm test
```

## 다음 단계

도메인과 화면 요구사항이 정해지면 내비게이션, 환경별 API 설정, 인증, 상태 관리 및 데이터베이스를 순서대로 추가합니다.
