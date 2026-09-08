# 서버 리뷰: nearby-places / place-detail

- 리뷰 역할: server-reviewer
- 대상: `com.planbee.api.place`, `common/CacheConfig`, `SecurityConfig`, `application.properties`,
  `.env.example`, `docker-compose.yml`, `build.gradle` (PR #9)
- 판정: **PASS** (아래 `[MUST]` 2건은 리뷰 세션 중 server-developer 가 수정, 재확인 완료)
- 근거: `docs/conventions/server.md`, `docs/conventions/common.md`, `contract.yaml`, `PRD.md`

## `[MUST]` — defects.md 로 이관 (수정됨)

- **DEF-001** — 다중 카테고리 병합 결과가 실제 거리순이 아니었다. `sortDistance` 가 거리 유무만
  판정(0 / `MAX_VALUE`)했다. **명명이 하는 일과 불일치**(server.md 판정 항목 "명명") +
  계약 `sort=distance` / AC-NP-7 미충족. → `distanceMeters` 로 정렬하도록 수정.
- **DEF-002** — 좌표 없는 장소에 `0.0` 을 채워 응답에 포함했다. "주변" 목록의 의미와 어긋나고
  지도에 (0,0) 마커를 만든다. → 좌표 없는 항목은 목록에서 제외하도록 수정.

## `[SHOULD]` — 제안 (차단 안 함)

- `PlaceController` 가 `assertSupportedSort` + `nearby` 두 서비스 호출로 나뉘어 있었다 (S-5 취지 —
  정책이 컨트롤러 배선으로 샘). → `sort` 를 `nearby()` 인자로 넘겨 한 메서드로 합침 (수정 반영).
- 캐시 키가 정확한 좌표라 1m 차이도 미스다. 좌표 격자 반올림으로 적중률을 올릴 여지 (server-tester 이후 검토).
- `typeTags` 가 콘텐츠 유형 하나를 태그로 반환한다(`["#관광지"]`). 계약상 "콘텐츠 유형 태그" 로
  문서화돼 있어 위반은 아니나, TourAPI `cat2`/`cat3` 를 태그로 쓰는 편이 화면에 유용하다.

## 규칙 준수 확인

| 항목 | 결과 |
|---|---|
| 레이어 경계 (S-3·S-5) | PASS — 컨트롤러는 위임만, 비즈니스 로직은 서비스, 엔티티 없음(외부 API DTO record) |
| 도메인 결합 (S-1·S-2) | PASS — `place` → `common` 단방향. `common/CacheConfig` 는 범용(모든 도메인이 `@Cacheable` 가능) |
| 오류 처리 (S-7·S-18) | PASS — 전부 `BusinessException`, `PlaceErrorCode` 카탈로그 등록(`error-codes.md`) |
| 외부 HTTP (S-31) | PASS — 타임아웃·도메인 예외·방어적 파싱·env 키·캐시. 재시도/서킷은 S-31 이 "필요해지면" 으로 유예 |
| 시크릿 (C-4) | PASS — `TOUR_API_KEY` env-only, `RequiredEnvironmentCheck`·`.env.example`·compose 등록, fallback 없음 |
| 계약 정합성 (C-5·C-7) | PASS — `make contract-check` 통과. `snake_case` 경계, `@SecurityRequirements` 로 `security: []` 명시 |
| 공개 경로 (S-19) | PASS — `SecurityConfig.PUBLIC_PATHS` 의 `/api/v1/places/**` 와 컨트롤러 `@SecurityRequirements` 일치 |

## 다음 역할

server-tester (통합 테스트 — WireMock 으로 TourAPI 스텁, AC-NP-7~10 · PD 실패 케이스).
