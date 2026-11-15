# 재난방송실 — 개발 계획

## 현재 상태

<!-- 구현 상태와 검증 범위를 구분하고 다음 작업을 유지한다. -->

- **단계:** 첫 사용 범위 P1~P6 구현·로컬 출력 확인 및 1차 유지보수 정리 완료.
- **확인 범위:** 프레임 출력, 서로 다른 두 외부 입력의 전체 H.264/AAC MP4, 1080p 60fps, 구간·전체의 시간·카메라·음향, 빈 외부 폴더의 패키지 설치·스킬 복사, 새 연출 기능과 독립 단편 전체 출력, 문자 수신·동시 발송·시간 도약 경계, Tone.js WAV 생성·로컬 샘플·시드 재현·실패 정리, 지도 채우기/윤곽선 중첩·범례, 외부 작품 초기화·충돌 보호, 공통 설치 도구의 격리 Git 설치·갱신, 선택적 화면 후처리, 공통 수신음·수신 지역 강조·시계 전환·상태 진입·송출 종료 연출, 뉴스 교체·문자 이력 이동·상태 교체/해제·페이지/방송 안내 전환, 상태·수신 지역 3회 점멸과 과거 문자 등급 색상 유지.
- **실행 환경:** Linux x64, Node.js 24.22.1, Chrome Headless Shell 158, 소프트웨어 WebGL `swangle`. Windows/macOS는 직접 실행하지 않았다.
- **배포:** npm 공개 패키지 [`disaster-broadcast-studio@0.1.1`](https://www.npmjs.com/package/disaster-broadcast-studio) 게시 완료. 소스와 `npm pack` 배포물도 제공한다. 독립 작품과 재현 파일은 개발 저장소 밖에서 제작했다. 영상 외부 업로드는 하지 않았다.

## 단계별 결과

| 단계 | 관련 요구 | 충족한 결과 | 근거 |
| --- | --- | --- | --- |
| P1 제작 계약·로컬 렌더 | F1, F2, F5, N2, N3, N4 | strict 스키마·참조 오류·결정적 시간·프레임 출력 | `src/scenario.ts`, `load.ts`, `timeline.ts`, `tests/contracts.test.ts` |
| P2 방송 화면·지도 | F3, F5, N1, N2, N4 | 정밀 행정경계·카메라·보조 지도·차가운 방송 레이아웃·최신순 문자 이력·뉴스·상태 박스·방송 안내·영역·진행선 | `src/video`, 실제 출력 프레임 |
| P3 연출·음향·영상 | F1, F2, F4, F5, N1, N2, N3 | 병렬 연출·페이드·침묵·1080p60 H.264/AAC·구간 출력 | 전체·구간 영상, 미디어·PCM 확인 |
| P4 독립 스킬·패키지 | F6, N4 | 실제 CLI 계약·경보/동원/대비태세 자료·창작 연출·게시용 출처·패키징 | `skills/scenario-writing`, `assets/README.md`, 외부 스킬 복사 |
| P5 다작품·외부 사용 | F1~F6, N1~N4 | 엔진 변경 없이 서로 다른 외부 데이터 출력 | 외부 설치본 검증·전체·구간 출력 |
| P6 독립 완성 작품 | F1~F6, N1~N4 | 외부 설치본으로 5분 10초 허구 단편·재현 파일 제작 | 전체 MP4의 실제 프레임·미디어·음향 확인 |

현재 사용법은 [README](../README.md)와 배포용 [파일 형식·CLI](../skills/scenario-writing/references/format.md)를 따른다. 주요 판단과 검증 범위는 작업별 이력에서 확인한다.

| 작업 | 기록 |
| --- | --- |
| 첫 구현·외부 작품·실행 환경 | [첫 구현](history/2026-11-14-first-release.md) |
| 정밀 지도·레이아웃·글꼴 | [화면 개선](history/2026-11-15-map-and-layout.md) |
| 상태 표시·창작 지원·완성 작품 | [제작 완성](history/2026-11-15-status-and-production.md) |
| 음원 생성·지도 중첩·문자 이력 | [음원·지도](history/2026-11-15-audio-and-overlays.md) |
| 작품 초기화·스킬 설치·후처리 | [창작 작업공간](history/2026-11-15-authoring-workspace.md) |
| 수신·시간·결말 연출 | [연출 개선](history/2026-11-15-arrival-and-time.md) |
| 지도 안정성·시계 전환 | [지도·전환 개선](history/2026-11-15-stable-map-and-clock.md) |
| 책임 분리·출력 보호·회귀 테스트·README | [1차 마무리](history/2026-11-15-refactoring-and-handoff.md) |
| 정보 변경 피드백·상태 교체/해제 | [정보 전환](history/2026-11-15-information-transitions.md) |
| 상태·수신 지역 점멸·문자 이력 등급 색상 | [점멸·등급 색상](history/2026-11-15-notification-blinks.md) |
| npm 첫 공개 게시·레지스트리 설치 검증·README 이미지 | [npm 게시](history/2026-11-15-npm-publication.md) |

## 다음 작업

확정 기능의 구현 잔여는 없다. Windows/macOS의 실행 확인과 영상 외부 업로드는 별도 사용·배포 시점에 진행한다. 후속 기능은 실제 작품 제작 피드백을 기준으로 정한다.
