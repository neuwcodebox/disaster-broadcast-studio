# 작품 파일과 CLI

## 작업 공간과 설치

Node.js 22 이상을 사용한다. 제작 도구의 npm 패키지는 `disaster-broadcast-studio`, 실행명은 `dbs`다. 공개 npm 게시 전에는 제공된 `.tgz`를 `npm install /path/disaster-broadcast-studio-0.1.0.tgz`로 설치한다. 개발 저장소는 필요하지 않다. 작품과 자산은 별도 폴더에 둔다.

```sh
npx dbs --help
npx dbs schema --out scenario.schema.json
npx dbs regions
npx dbs validate scenario.yaml
npx dbs frame scenario.yaml --frame 360 --out frame.png
npx dbs render scenario.yaml --from 300 --to 599 --out clip.mp4
npx dbs render scenario.yaml --out film.mp4
```

프레임은 0부터, 구간 끝은 포함한다. 위 구간은 60fps에서 5초다. `--browser`로 Chromium 경로를 지정할 수 있다. 생략하면 Remotion이 Chrome Headless Shell을 관리하며 최초 설치에 인터넷이 필요하다. 이후 렌더 자체는 로컬 자산만 사용한다. Linux 소프트웨어 렌더는 `--gl swangle`, GPU는 기본 `angle`이다. `--concurrency` 기본 2, `--overwrite`는 기존 출력을 교체할 때만 쓴다. 실패 시 종료코드 1과 입력 위치를 확인한다. 출력 옆 `.json`에는 작품·프레임 범위·자산 출처가 기록된다.

## 최상위 필드

YAML 또는 JSON을 사용한다. 알 수 없는 필드와 중복 YAML 키는 오류다. 정확한 기계 계약은 `dbs schema`의 JSON Schema다.

| 필드 | 의미 |
| --- | --- |
| `version` | `1` |
| `title` | 화면 제목. 최대 70자 |
| `fictionNotice` | 필수 허구 고지. 첫 3초 오프닝에 표시. 최대 160자 |
| `timezone` | 화면 시계 IANA 시간대. 기본 `Asia/Seoul` |
| `seed` | 간섭 효과의 결정적 시드. 기본 1 |
| `agencies` | 기관·뉴스 출처 ID → 표시명 사전 |
| `assets` | 음원 ID → `{path, source, license}`. 경로는 작품 파일 기준 로컬 파일 |
| `map` | `{camera, regions?, attribution?}`. 기본 시군구 경계를 사용하거나 로컬 GeoJSON 교체 |
| `cuts` | 영상에 이어 붙일 컷 목록 |
| `events` | 내용·연출 이벤트 목록 |

기관의 주장이 서로 다르다는 이유로 검증이 실패하지 않는다. 정정은 원문 수정 대신 `corrects`로 이전 문자 ID를 참조하는 새 문자로 작성한다.

## 컷과 시간

각 컷은 `{id, duration, storyTime, fadeIn?, fadeOut?}`다. `duration`·페이드는 초, `storyTime`은 `2026-01-01T12:00:00+09:00`처럼 시간대가 있는 ISO 시각이다. 컷은 목록 순서대로 빈틈없이 이어진다. 컷 내부는 1:1 실시간이며 다음 `storyTime`은 이전 컷 종료 이후여야 한다. 시간 도약은 컷 경계에서만 일어난다. 영상 처음 3초는 제목·허구 고지 오프닝이므로 본문 읽기·중요 사건은 그 이후로 배치한다. 오프닝도 첫 컷 시간에 포함된다.

모든 이벤트의 공통 필드는 `id`, `type`, `cut`, `at`이다. `at`은 지정 컷 시작 이후 초다. 모든 초는 `round(seconds * 60)`으로 프레임화한다. 동일 프레임 사건은 파일 순서를 유지한다. `duration`이 있는 이벤트는 종료 시 사라진다. 컷을 넘기는 이벤트는 `carry: true`가 필요하며, 전체 영상 길이를 넘길 수 없다. 문자 이력은 후속 컷에도 남는다.

## 지도 카메라와 지역

`camera`는 `{center: [경도, 위도], zoom, bearing?, pitch?}`다. 기본 방위각·기울기는 0. WGS84, 위도 범위 -85~85, zoom 1~14, pitch 0~60이다. 경계 파일 feature의 `id` 또는 `properties.SIG_CD`를 지역 ID로 사용한다. 기본 코드·이름은 `dbs regions`로 찾고 추측하지 않는다. 사용자 경계의 출처를 `map.attribution`에 적는다.

## 이벤트

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `alert` | `sender`, `text`, `level?`, `regions?`, `corrects?`, `occurredAt?`, `publishedAt?`, `pageSeconds?` | 수신 시각은 `cut + at`. 수준은 `안전안내`/`긴급재난`/`위급재난`, 기본 안전안내. 최대 4,000자 전문 보존. 100자 이하 페이지로 나누며 기본 페이지당 8초. 최신 문자와 이전 이력 1개를 표시하며 누적 이력을 순환한다. 이전 문자는 삭제되지 않는다. |
| `news` | `duration`, `source`, `headline`, `publishedAt?`, `carry?` | 하단 뉴스. 최대 160자. `publishedAt` 생략 시 수신 시각. 뉴스끼리 중첩 금지 |
| `region` | `duration`, `regions`, `color?`, `label?`, `pulse?`, `carry?` | 실제 행정구역 면적 강조. `color`는 `#RRGGBB`. 명시한 경우만 펄스 |
| `marker` | `duration`, `position`, `label`, `color?`, `effect?`, `carry?` | 지점과 이름. effect는 `point` 또는 `ring` |
| `camera` | `duration`, `to`, `ease?`, `carry?` | 직전 카메라에서 `to`로 프레임 보간. 기본 smooth, linear 가능. 카메라끼리 중첩 금지. 완료 위치 유지 |
| `inset` | `duration`, `camera`, `title`, `carry?` | 지도 내부의 보조 지도. 동시 1개 |
| `audio` | `duration`, `asset`, `offset?`, `volume?`, `fadeIn?`, `fadeOut?`, `carry?` | 로컬 음원. offset 초, volume 기본 1, 범위 0~2. 페이드 기본 0 |
| `silence` | `duration`, `carry?` | 해당 구간의 모든 음원 음소거. 음원 재생 위치는 계속 진행 |
| `screen` | `duration`, `effect`, `intensity?`, `fadeIn?`, `fadeOut?`, `carry?` | blackout/flash/interference. intensity 기본 1, 범위 0~1. 독립 효과는 병렬 가능 |

여러 기관의 문자를 동시에 도착시키거나 지도 강조와 소리·뉴스를 겹칠 수 있다. 지도 강조와 문자는 독립된 이벤트다. 문자만 발송했다고 영역을 자동 추측하거나 강조하지 않는다. 발신자·행동 지시·대상 지역과 지도 연출이 일치하도록 작성한다.

문자 검증의 읽기 시간 경고를 확인하고 다음 문자까지 충분한 간격을 둔다. 매우 긴 문안은 최신 카드의 전체 페이지를 읽을 수 있을 만큼 유지한다. 헤드라인은 실제 한국 뉴스처럼 짧게 쓰고 사건의 모든 미세 단계를 각각 보도하지 않는다.
