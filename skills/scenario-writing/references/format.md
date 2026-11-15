# 작품 파일과 CLI

## 독립 작업 공간

Node.js 22 이상을 사용한다. npm 패키지는 `disaster-broadcast-studio`, 실행명은 `dbs`다. 공개 npm 게시 전에는 제공된 `.tgz`를 `npm install /path/disaster-broadcast-studio-0.1.0.tgz`로 설치한다. 작품과 자산은 별도 폴더에 둔다. 개발 저장소나 개발용 AGENTS.md는 필요하지 않다.

```sh
npx dbs schema --out scenario.schema.json
npx dbs regions --search 철원 --json
npx dbs validate scenario.yaml
npx dbs inspect scenario.yaml --frame 360
npx dbs frame scenario.yaml --frame 360 --out frame.png
npx dbs render scenario.yaml --from 300 --to 599 --out clip.mp4
npx dbs render scenario.yaml --out film.mp4
npx dbs credits scenario.yaml --out description-credits.txt
```

프레임은 0부터, 구간 끝은 포함한다. 300~599는 60fps에서 5초다. `inspect`는 해당 프레임의 이야기 시각·카메라·활성 연출·문자 이력을 렌더 없이 반환한다. `regions`는 내장 시군구 ID와 이름을 검색한다. `schema`의 JSON Schema가 정확한 필드 계약이다.

`--browser`로 Chromium 경로를 지정할 수 있다. 생략하면 Remotion이 Chrome Headless Shell을 관리하며 최초 설치에 인터넷이 필요하다. 이후 렌더는 로컬 자산만 사용한다. Linux 소프트웨어 렌더는 `--gl swangle`, GPU는 기본 `angle`이다. `--concurrency` 기본값은 2다. `--overwrite` 없이 기존 결과를 덮어쓰지 않는다. 실패 시 종료코드 1과 입력 위치를 반환한다.

영상과 프레임 옆 `.json`은 작품·프레임 범위·자산 출처를 기록하고, `.credits.txt`는 게시용 출처 문안이다. 지도 출처를 화면에 상시 표시하지 않으므로 유튜브 설명란 등에 이 문안을 포함한다. 동봉 지도에 적용되는 출처·제공자·라이선스·가공 내용과 작품 음원 정보를 보존한다. 사용자 자산이 화면 내 표기를 요구하면 그 조건도 별도로 충족한다.

## 최상위 필드

YAML/JSON을 사용한다. 알 수 없는 필드와 중복 YAML 키는 오류다.

| 필드 | 의미 |
| --- | --- |
| `version` | `1` |
| `title` | 오프닝 작품 제목. 최대 70자. 정상 화면 상단 제목으로 반복하지 않음 |
| `fictionNotice` | 필수 허구 고지. 첫 3초 오프닝에 표시. 최대 160자 |
| `timezone` | 화면 시계 IANA 시간대. 기본 `Asia/Seoul` |
| `seed` | 간섭 효과의 결정적 시드. 기본 1 |
| `agencies` | 기관·뉴스 출처 ID → 표시명 사전 |
| `assets` | 음원 ID → `{path, source, license}`. 경로는 작품 파일 기준 로컬 파일 |
| `map` | `{camera, regions?, attribution?}`. 사용자 GeoJSON에는 필요한 출처 전체를 `attribution`에 기재 |
| `cuts` | 영상에 이어 붙일 컷 목록 |
| `events` | 내용·연출 이벤트 목록 |

기본 지도는 실제 시군구 경계를 사용한다. 지역 이름·시설명·출처를 지도 위에 기본 표시하지 않는다. `region.label`·`marker.label`은 작품상 필요한 경우에만 작성한다. 시설명은 데이터에 자동 포함되는 POI가 아니다.

사용자 경계는 WGS84 Polygon/MultiPolygon FeatureCollection이다. 각 Feature에 고유 `id` 또는 `properties.SIG_CD`를 두며 선택적 `name` 또는 `SIG_KOR_NM`을 표시명으로 쓴다. `dbs regions`는 사용자 파일이 아닌 내장 목록을 반환한다.

## 컷과 시간

컷은 `{id, duration, storyTime, fadeIn?, fadeOut?}`다. 길이·페이드는 초, `storyTime`은 시간대가 있는 ISO 시각이다. 컷은 목록 순서대로 이어진다. 컷 내부 시계는 현실과 1:1로 흐른다. 다음 `storyTime`은 이전 컷 종료 이후여야 한다. 배속 필드는 없으며 시간 생략은 컷 경계에서만 일어난다.

영상 처음 3초는 제목·허구 고지 오프닝이다. 첫 컷 시간에 포함되므로 본문 읽기·중요 사건은 그 이후에 배치한다. 컷 페이드와 `screen.blackout`으로 시간 도약의 호흡을 만들 수 있다. 편집을 위해 매 사건마다 컷을 나누지 않는다.

공통 이벤트 필드는 `id`, `type`, `cut`, `at`다. `at`은 해당 컷 시작 후 초다. 문자 이외에는 양수 `duration`이 필요하며 활성 구간은 `[시작, 종료)`다. 컷을 넘겨 유지하려면 `carry: true`를 명시하고 끝이 전체 영상 안에 있어야 한다. ID는 영문·숫자·밑줄·하이픈을 사용한다. 지역 ID도 문자열로 쓴다.

## 내용·방송 화면

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `alert` | `sender`, `text`, `level?`, `regions?`, `corrects?`, `occurredAt?`, `publishedAt?`, `pageSeconds?` | 수신 이후 최신순 이력에 남는다. duration/carry 없음 |
| `news` | `duration`, `source`, `headline`, `publishedAt?`, `carry?` | 하단 뉴스. 동시 1개. 최대 160자 |
| `status` | `duration`, `items: [{text, color}]`, `carry?` | 상단 상태 박스 전체. 동시 1개 |
| `bulletin` | `duration`, `source`, `heading`, `text`, `color?`, `pageSeconds?`, `carry?` | 지도·문자 부분을 덮는 방송 안내. 시계·상태·하단 뉴스 유지. 동시 1개 |

`sender`와 `source`는 `agencies`의 ID다. 문자는 실제 수신 시각을 이벤트의 `at`으로 정한다. 발생·발표 시각을 별도로 주지 않으면 임의로 만들어 표시하지 않는다. 문자 등급은 `안전안내`(기본)·`긴급재난`·`위급재난`이다. 원문에 `[발신자 표시명]`이 있으면 그대로 사용하고, 없으면 앞에 붙인다. 별도 기관명 칸을 반복하지 않는다. 정정은 원 ID를 `corrects`로 참조하는 새 문자다. 서로 다른 기관의 상충된 주장은 데이터 오류가 아니다.

문자 이력은 수신 최신순으로 쌓인다. 같은 시점에 도착한 문자는 시나리오 배열의 뒤 항목을 위에 둔다. 새 문자 도착 시 기존 항목이 아래로 이동하고, 패널 높이를 넘긴 항목은 아래쪽에 가려진다. 시간 도약 후에도 이전 수신 이력을 유지한다.

문자와 방송 안내 본문은 100개 문자소 단위에서 자연스러운 공백을 찾아 분할하며 원문을 보존한다. `alert.pageSeconds` 기본 8초, `bulletin.pageSeconds` 기본 12초, 둘 다 최소 3초다. 장문 안내 전체 페이지가 끝나기 전에 다른 안내로 덮지 않는다. `validate`의 문자 읽기 경고를 확인한다. 방송 안내 길이도 작성자가 읽어 검토한다.

상태 박스에는 문구와 `#RRGGBB` 색상만 있다. 경보 종류·단계·규칙을 엔진이 판단하지 않는다. 전체 문구를 `DEFCON 4`, `갑호비상`, `소방동원령 1호`처럼 짧게 작성한다. 배열 순서대로 나란히 표시한다. 변경할 때는 현재 이벤트 종료와 다음 이벤트 시작을 맞춘다. `items: []`나 상태 이벤트가 없는 구간에는 박스가 없다. 화면 폭에 맞는 개수와 길이로 작성하고 실제 프레임을 확인한다.

## 지도 연출

카메라는 `{center: [경도, 위도], zoom, bearing?, pitch?}`다. bearing 기본 0, pitch 기본 0, zoom 1~14, pitch 0~60이다. 지도와 보조 지도는 같은 좌표 체계와 실제 경계를 사용한다.

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `region` | `duration`, `regions`, `color?`, `label?`, `pulse?`, `carry?` | 실제 행정구역 강조. 색 기본 `#b9615b`, pulse 기본 false |
| `marker` | `duration`, `position`, `color?`, `label?`, `effect?`, `carry?` | 지점 또는 확대 후 멈추는 링. effect는 point(기본)/ring |
| `zone` | `duration`, `points`, `color?`, `opacity?`, `carry?` | 행정구역과 다른 작품상의 영역. 처음·끝 좌표가 같은 닫힌 링, 최소 4점. opacity 기본 0.18 |
| `line` | `duration`, `points`, `color?`, `width?`, `drawSeconds?`, `dashed?`, `carry?` | 지도에 투영되는 연결·경로·경계선. 최소 2점. width 기본 2px, drawSeconds 기본 0, dashed 기본 false |
| `camera` | `duration`, `to`, `ease?`, `carry?` | 카메라 보간. ease smooth(기본)/linear. 완료 위치 유지. 동시 1개 |
| `inset` | `duration`, `camera`, `title`, `carry?` | 지도 내부의 지역 확대 화면. 동시 1개 |

`line.drawSeconds` 동안 선이 처음부터 끝까지 나타난 뒤 이벤트 종료까지 유지된다. drawSeconds보다 이벤트가 먼저 끝나면 그 길이까지 나타난 뒤 사라진다. 점선과 조합할 수 있다. 영역·선은 지도 카메라와 함께 이동한다. 실제 행정구역을 강조할 때 임의 다각형으로 흉내 내지 말고 `region`을 쓴다. `zone`은 해상 통제구역·관측 범위처럼 행정 경계와 다른 작중 영역에 사용한다. 라벨·선·지점은 사건의 의미가 있을 때만 쓰며 지도에 모든 문장을 옮기지 않는다.

문자 `regions`와 지도 연출은 독립적이다. 문자 도착만으로 임의의 영역을 자동 강조하지 않는다. 대상 범위·발신기관·행동 지시와 지도 강조를 함께 검토한다. 지역 강조·지점·영역·선은 여러 개를 병렬로 사용할 수 있다.

## 음향·화면 효과

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `audio` | `duration`, `asset`, `offset?`, `volume?`, `fadeIn?`, `fadeOut?`, `carry?` | 로컬 음원. offset 초, volume 기본 1(0~2), 페이드 기본 0 |
| `silence` | `duration`, `carry?` | 모든 음원 음소거. 원음 재생 위치는 계속 진행 |
| `screen` | `duration`, `effect`, `intensity?`, `fadeIn?`, `fadeOut?`, `carry?` | blackout/flash/interference. intensity 기본 1(0~1). 병렬 조합 가능 |

음원 시작 위치와 연출은 영상 프레임에서 계산한다. 컷 경계를 넘길 음원은 carry를 지정하고 로컬 파일의 길이도 확보한다. 음원을 자동 반복하지 않는다. 큰 음량·지속적인 노이즈·잦은 섬광으로 공포를 대신하지 않는다. 실제 기관의 경보음을 기본 삽입하지 않는다.

## 짧은 상태 표시 예

아래는 계약 예시이며 작품 줄거리가 아니다. 기존 작품의 `events` 안에 넣고 컷 ID를 맞춘다.

```yaml
- id: readiness
  type: status
  cut: opening
  at: 3
  duration: 20
  items:
    - text: DEFCON 4
      color: '#a5afb6'
    - text: 소방동원령 1호
      color: '#c28b66'
```
