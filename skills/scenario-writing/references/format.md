# 작품 파일과 CLI

## 독립 작업 공간

Node.js 22 이상을 사용한다. `npm install disaster-broadcast-studio`로 패키지를 설치하며 실행명은 `dbs`다. 전달받은 `.tgz`가 있으면 `npm install /path/to/package.tgz`로도 설치할 수 있다. 작품은 `npx dbs init ./my-film`으로 초기화한다. `scenario.yaml`, `README.md`, `audio/`, `audio-code/`를 생성한다. 경로를 생략하면 현재 폴더다. 기존 충돌 파일이 있으면 생성 전에 중단하며 사용자 파일은 덮어쓰지 않는다. 스킬은 [사용자 공통 설치](https://github.com/neuwcodebox/disaster-broadcast-studio/blob/main/skills/README.md)를 이용하며 작품 폴더에 복사하지 않는다. 개발 저장소나 개발용 AGENTS.md는 필요하지 않다.

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

프레임은 0부터, 구간 끝은 포함한다. 300~599는 60fps에서 5초다. `inspect`는 해당 프레임의 이야기 시각·카메라·활성 연출·문자 이력을 렌더 없이 반환한다. `regions`는 내장 대한민국 시군구 ID와 이름을 검색한다. 코드를 추측하거나 옛 행정코드를 기억으로 넣지 않는다. 예를 들어 `dbs regions --search 철원`의 결과는 `51780 철원군`이다. `--json`으로 목록을 읽고 문자열 ID를 사용한 뒤 `dbs validate scenario.yaml`로 실제 경계와 대조한다. 내장 목록은 SGIS/admdongkor 2026-07-01 경계를 시군구로 병합한 것이다. 북한의 배경 육지는 시군구 선택 목록이 아니다. 사용자 GeoJSON을 쓰면 그 파일의 Feature ID를 읽어 사용한다. `schema`의 JSON Schema가 정확한 필드 계약이다.

`--browser`로 Chromium 경로를 지정할 수 있다. 생략하면 Remotion이 Chrome Headless Shell을 관리하며 최초 설치에 인터넷이 필요하다. 이후 렌더는 로컬 자산만 사용한다. Linux 소프트웨어 렌더는 `--gl swangle`, GPU는 기본 `angle`이다. `--concurrency` 기본값은 2다. `--overwrite` 없이 기존 결과와 부속 `.json`·`.credits.txt`를 덮어쓰지 않는다. 실패 시 종료코드 1과 입력 위치를 반환한다.

영상과 프레임 옆 `.json`은 작품·프레임 범위·자산 출처를 기록하고, `.credits.txt`는 게시용 출처 문안이다. 지도 출처를 화면에 상시 표시하지 않으므로 유튜브 설명란 등에 이 문안을 포함한다. 동봉 지도에 적용되는 출처·제공자·라이선스·가공 내용과 작품 음원 정보를 보존한다. 사용자 자산이 화면 내 표기를 요구하면 그 조건도 별도로 충족한다.

## 최상위 필드

YAML/JSON을 사용한다. 알 수 없는 필드와 중복 YAML 키는 오류다.

| 필드 | 의미 |
| --- | --- |
| `version` | `1` |
| `title` | 오프닝 작품 제목. 최대 70자. 정상 화면 상단 제목으로 반복하지 않음 |
| `fictionNotice` | 필수 허구 고지. 첫 5초 오프닝에 표시. 최대 160자 |
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

컷은 `{id, duration, storyTime, clockTransition?, fadeIn?, fadeOut?}`다. 길이·페이드는 초, `storyTime`은 시간대가 있는 ISO 시각이다. 컷은 목록 순서대로 이어진다. 컷 내부 시계는 현실과 1:1로 흐른다. 다음 `storyTime`은 이전 컷 종료 이후여야 한다. 배속 필드는 없으며 시간 생략은 컷 경계에서만 일어난다.

영상 처음 5초는 제목·허구 고지 오프닝이다. 첫 컷 시간에 포함되므로 본문 읽기·중요 사건은 그 이후에 배치한다. 시간을 건너뛰는 컷에 `clockTransition: 4.2`를 주면 이전 화면을 유지한 채 기존 상단 시계를 밝게 강조하고, 이전 종료 시각에서 새 시각으로 숫자가 빠르게 이동한 뒤 도착 시각을 잠깐 유지한다. 강조가 사라지면 정확한 현재 시각에서 실시간으로 흐른다. 시계의 위치와 크기는 유지한다. 첫 컷에는 지정하지 않는다. 새 문자·뉴스·상태·지도 변화는 전환이 끝난 후 약 0.1~0.4초 간격을 두고 배치해 기존 이력과 구분한다. 페이드는 선택이며 시계 전환을 가리지 않게 한다. 편집을 위해 매 사건마다 컷을 나누지 않는다.

공통 이벤트 필드는 `id`, `type`, `cut`, `at`다. `at`은 해당 컷 시작 후 초다. 문자 이외에는 양수 `duration`이 필요하며 활성 구간은 `[시작, 종료)`다. 컷을 넘겨 유지하려면 `carry: true`를 명시하고 끝이 전체 영상 안에 있어야 한다. ID는 영문·숫자·밑줄·하이픈을 사용한다. 지역 ID도 문자열로 쓴다.

## 내용·방송 화면

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `alert` | `sender`, `text`, `level?`, `regions?`, `corrects?`, `occurredAt?`, `publishedAt?`, `pageSeconds?`, `mapHighlight?`, `sound?` | 수신 이후 최신순 이력에 남는다. duration/carry 없음 |
| `news` | `duration`, `source`, `headline`, `publishedAt?`, `carry?` | 하단 뉴스. 동시 1개. 최대 160자 |
| `status` | `duration`, `items: [{text, color}]`, `carry?` | 상단 상태 박스 전체. 동시 1개 |
| `bulletin` | `duration`, `source`, `heading`, `text`, `color?`, `pageSeconds?`, `carry?` | 지도·문자 부분을 덮는 방송 안내. 시계·상태·하단 뉴스 유지. 동시 1개 |

`sender`와 `source`는 `agencies`의 ID다. 문자는 실제 수신 시각을 이벤트의 `at`으로 정한다. 발생·발표 시각을 별도로 주지 않으면 임의로 만들어 표시하지 않는다. 문자 등급은 `안전안내`(기본)·`긴급재난`·`위급재난`이다. 원문에 `[발신자 표시명]`이 있으면 그대로 사용하고, 없으면 앞에 붙인다. 별도 기관명 칸을 반복하지 않는다. 정정은 원 ID를 `corrects`로 참조하는 새 문자다. 서로 다른 기관의 상충된 주장은 데이터 오류가 아니다.

문자 이력은 수신 최신순으로 쌓인다. 같은 시점에 도착한 문자는 시나리오 배열의 뒤 항목을 위에 둔다. 새 문자 도착 시 기존 항목이 아래로 이동하고, 패널 높이를 넘긴 항목은 아래쪽에 가려진다. 시간 도약 후에도 이전 수신 이력을 유지한다.

문자와 방송 안내 본문은 100개 문자소 단위에서 자연스러운 공백을 찾아 분할하며 원문을 보존한다. `alert.pageSeconds` 기본 8초, `bulletin.pageSeconds` 기본 12초, 둘 다 최소 3초다. 장문 안내 전체 페이지가 끝나기 전에 다른 안내로 덮지 않는다. 발신자·본문·등급·정정 대상이 같은 연속 반복 문자는 매번 새 문장을 읽을 필요가 없어 다음 동일 문자까지의 읽기 간격 경고에서 제외한다. `validate`의 문자 읽기 경고를 확인한다. 방송 안내 길이도 작성자가 읽어 검토한다.

뉴스 교체·종료, 새 문자 수신, 장문 페이지 변경, 상태의 등장·교체·해제와 방송 안내 진입·종료에는 약 0.45초의 이동·명도 전환이 기본 적용된다. 새 문자는 위에서 펼쳐지며 이전 이력을 아래로 밀어낸다. 이력으로 내려간 문자도 등급 배지·왼쪽 테두리의 색상은 유지한다. 상태는 유지되는 문구·색상을 다시 강조하지 않고 바뀐 항목만 같은 칸에서 교체한다. 새 상태는 진입 후 1.8초 동안 3회 밝기가 내려갔다 돌아오고 배경·하단 선으로 함께 강조한다. 범례·보조 지도도 부드럽게 진입한다. 종료 전환은 이벤트 종료 프레임부터 최대 약 0.45초 동안 이전 문구를 보여주며 사라진다. 모두 콘텐츠 프레임 기준이므로 시계 전환 중에는 효과도 멈추며 별도 애니메이션 데이터를 작성할 필요가 없다.

상태 박스에는 문구와 `#RRGGBB` 색상만 있다. 경보 종류·단계·규칙을 엔진이 판단하지 않는다. 전체 문구를 `DEFCON 4`, `갑호비상`, `소방동원령 1호`처럼 짧게 작성한다. 배열 순서대로 나란히 표시한다. 변경할 때는 현재 이벤트 종료와 다음 이벤트 시작을 맞춘다. `items: []`나 상태 이벤트가 없는 구간에는 해제 전환 후 박스가 없다. 화면 폭에 맞는 개수와 길이로 작성하고 실제 프레임을 확인한다.

## 지도 연출

카메라는 `{center: [경도, 위도], zoom, bearing?, pitch?}`다. bearing 기본 0, pitch 기본 0, zoom 1~14, pitch 0~60이다. 지도와 보조 지도는 같은 좌표 체계와 실제 경계를 사용한다.

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `region` | `duration`, `regions`, `color?`, `fillOpacity?`, `strokeColor?`, `strokeOpacity?`, `strokeWidth?`, `label?`, `pulse?`, `fadeIn?`, `fadeOut?`, `carry?` | 실제 행정구역 강조. 색 기본 `#b9615b`, pulse 기본 false |
| `legend` | `duration`, `items: [{text, color, symbol?}]`, `carry?` | 지도 하단 범례. symbol은 fill(기본)/outline/line. 동시 1개 |
| `marker` | `duration`, `position`, `color?`, `label?`, `effect?`, `carry?` | 지점 또는 확대 후 멈추는 링. effect는 point(기본)/ring |
| `zone` | `duration`, `points`, `color?`, `opacity?`, `carry?` | 행정구역과 다른 작품상의 영역. 처음·끝 좌표가 같은 닫힌 링, 최소 4점. opacity 기본 0.18 |
| `line` | `duration`, `points`, `color?`, `width?`, `drawSeconds?`, `dashed?`, `carry?` | 지도에 투영되는 연결·경로·경계선. 최소 2점. width 기본 2px, drawSeconds 기본 0, dashed 기본 false |
| `camera` | `duration`, `to`, `ease?`, `carry?` | 카메라 보간. ease smooth(기본)/linear. 완료 위치 유지. 동시 1개 |
| `inset` | `duration`, `camera`, `title`, `carry?` | 지도 내부의 지역 확대 화면. 동시 1개 |

`line.drawSeconds` 동안 선이 처음부터 끝까지 나타난 뒤 이벤트 종료까지 유지된다. drawSeconds보다 이벤트가 먼저 끝나면 그 길이까지 나타난 뒤 사라진다. 점선과 조합할 수 있다. 영역·선은 지도 카메라와 함께 이동한다. 실제 행정구역을 강조할 때 임의 다각형으로 흉내 내지 말고 `region`을 쓴다. `zone`은 해상 통제구역·관측 범위처럼 행정 경계와 다른 작중 영역에 사용한다. 라벨·선·지점은 사건의 의미가 있을 때만 쓰며 지도에 모든 문장을 옮기지 않는다.

행정구역의 채우기 불투명도 `fillOpacity` 기본 0.36, 윤곽선 `strokeColor` 기본 color, `strokeOpacity` 기본 1, `strokeWidth` 기본 2px다. 채우기 없이 경계만 표시하려면 `fillOpacity: 0`, 채우기만 표시하려면 `strokeWidth: 0`을 준다. `fadeIn`·`fadeOut`은 초 단위이며 기본 0이다. `pulse`는 채우기 밝기만 완만하게 변화시키고 테두리는 유지한다. 같은 지역에 여러 이벤트를 겹칠 수 있으며 채우기 위에 윤곽선이 놓이고 같은 종류 안에서는 이벤트 순서대로 합성한다. `legend`는 작품이 지정한 의미만 설명한다. 범례가 없으면 엔진은 자동으로 의미를 붙이지 않는다. 서로 다른 사실을 나타내는 색·선은 문안·시점·범례와 함께 작성한다.

문자는 `regions`에 지정된 영역의 채우기를 수신 시 기본 2.4초 동안 3회 부드럽게 점멸한다. 테두리는 유지하며 각 점멸은 채우기가 나타났다가 사라지는 형태다. 기본 지도는 이 효과의 시작·종료에 따라 다시 그리지 않는다. `mapHighlight: {duration: 3, color: '#d6e2ec'}`로 바꾸거나 `mapHighlight: false`로 끈다. 빈 지역 목록은 강조하지 않는다. 이 효과는 짧은 수신 표시이며 지속적인 발송 이력 채우기·위기경보 경계는 별도 `region`으로 작성한다. 엔진이 기관명에서 발송 범위를 추측하지 않는다.

기관명은 발송 대상과 다를 수 있다. 도청이 특정 시군만 대상으로 보내면 본문에 그 시군을 명시하고 그 코드만 지정한다. ‘도 전역’ 문자는 내장 목록에서 도 소속 시군 전체를 조회해 포함한다. 모든 문자에서 본문 대상·`regions`·지속 지도 표시를 대조한다. 의도적인 불일치는 작성 근거를 작품 기록에 남기며 `mapHighlight: false`와 별도 지도 이벤트로 표현할 수 있다. 지역 강조·지점·영역·선은 여러 개를 병렬로 사용할 수 있다.

음원 코드 실행과 WAV 제작은 [Tone.js 음원 제작](audio.md)을 따른다.

## 음향·화면 효과

| `type` | 추가 필드 | 동작 |
| --- | --- | --- |
| `audio` | `duration`, `asset`, `offset?`, `volume?`, `fadeIn?`, `fadeOut?`, `carry?` | 로컬 음원. offset 초, volume 기본 1(0~2), 페이드 기본 0 |
| `silence` | `duration`, `carry?` | 모든 음원 음소거. 원음 재생 위치는 계속 진행 |
| `screen` | `duration`, `effect`, `intensity?`, `fadeIn?`, `fadeOut?`, `carry?` | blackout/flash/interference/noise/scanlines/chromatic/dropout/shutdown. intensity 기본 1(0~1). 병렬 조합 가능 |

음원 시작 위치와 연출은 영상 프레임에서 계산한다. 컷 경계를 넘길 음원은 carry를 지정하고 로컬 파일의 길이도 확보한다. 음원을 자동 반복하지 않는다. 큰 음량·지속적인 노이즈·잦은 섬광으로 공포를 대신하지 않는다. 문자에는 엔진이 직접 합성한 공통 수신음이 한 번 재생된다. 실제 기관 경보음을 모방한 소리가 아니다. `sound: false`로 끄거나 `sound: {asset: myTone, duration: 0.8, volume: 0.7}`로 사용자 자산을 지정한다. 기본은 `sound: default`이며 생략해도 같다. 별도 `audio` 이벤트로 수신음을 중복 삽입하지 않는다. `silence`는 공통 수신음도 음소거한다.

`shutdown`은 송출 화면을 최대 1.5초 동안 가로선→작은 점으로 수축하고 이벤트 종료까지 검은 화면을 유지한다. 전체 영상을 종료하는 효과가 아니므로 결말에서 충분한 duration을 지정한다. 신호가 사라지기 직전의 정보·음향·이후 침묵까지 작품 흐름으로 구성한다.

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

### 화면 후처리

`screen`은 기존 blackout(검정 덮기)·flash(흰 화면)·interference(신호 간섭)와 함께 다음 효과를 지원한다. 모두 명시한 이벤트에만 적용되며 `at`, `duration`, `intensity`, `fadeIn`, `fadeOut`, `carry`를 사용한다. 기본 화면에 자동으로 켜지지 않는다.

| effect | 표시 |
| --- | --- |
| noise | 프레임·작품 시드로 결정되는 흑백 잡음 |
| scanlines | 가로 주사선. 프레임에 따라 천천히 이동 |
| chromatic | 빨강·초록·파랑 채널의 가로 위치 어긋남 |
| dropout | 짧게 위치가 바뀌는 수평 신호 누락 대역. 전체 화면 끊김은 blackout, 음향 끊김은 silence로 별도 지정 |

여러 효과를 같은 구간에 배치할 수 있다. 새 후처리 네 종류는 같은 효과가 겹치면 강도를 합쳐 1 이내로 제한하고, 서로 다른 효과는 조합한다. 타이밍·페이드·잡음은 벽시계에 의존하지 않아 임의 프레임 탐색에서도 같다. 내용이 중요하면 낮은 강도와 짧은 구간부터 실제 출력에서 가독성을 확인한다.

```yaml
- id: signal-change
  type: screen
  cut: last
  at: 12
  duration: 0.4
  effect: chromatic
  intensity: 0.25
  fadeIn: 0.05
  fadeOut: 0.1
```

## 빠른 반복 수신과 즉시 암전

같은 문자로 이력을 채우려면 ID와 `at`이 다른 `alert` 이벤트들을 짧은 간격으로 배치한다. 별도 도배 문법은 없으며 일반 문자 이력과 정렬·수신 시각이 그대로 적용된다. 예를 들어 0.25초 간격 수신에서 일부만 공통 수신음을 울리고 나머지는 `sound: false`로 두면 수신음이 겹치지 않는다. 대상이 없는 출처 불명 문자는 빈 `regions`와 `mapHighlight: false`로 작성한다. 문구·색·화면 전체를 수신마다 번쩍이게 하지 않는다.

반복 직후 `screen`의 `blackout`을 `fadeIn: 0`으로 시작하고 같은 시각에 `silence`를 배치하면 화면·음향이 즉시 끊긴다. 검은 유지 구간도 이벤트 길이에 포함한다. 이런 결말을 모든 작품에 강제하지 않고 이야기 흐름에 맞춰 사용한다.
