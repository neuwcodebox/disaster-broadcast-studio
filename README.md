# 재난방송실 · Disaster Broadcast Studio

YAML/JSON 시나리오를 한국형 재난방송 호러 영상으로 만드는 CLI입니다. 문자·뉴스·지도·시계·음향을 텍스트로 연출하고, **1920×1080 · 60fps MP4**로 출력합니다.

![재난방송실 출력 화면 — 허구의 기술 검증용 방송](https://cdn.jsdelivr.net/npm/disaster-broadcast-studio@0.1.1/assets/preview.png)

## 할 수 있는 일

- **방송 화면:** 최신순 재난문자·정정 이력, 독립 뉴스, 상태 박스, 장문 방송 안내. 뉴스·문자·상태 변경을 알리는 기본 전환 효과.
- **지도 연출:** 실제 시도·시군구 경계, 채우기·윤곽선 중첩, 범례·지점·영역·진행선, 카메라 이동·보조 지도.
- **시간 연출:** 컷 안에서는 실시간으로, 컷 사이에서는 지정한 이야기 시각으로 전환. 임의 프레임에서도 같은 상태를 복원.
- **음향·효과:** 공통 수신음, 로컬 음원, Tone.js 코드의 WAV 합성, 페이드·침묵·신호 간섭·송출 종료.
- **텍스트 제작 흐름:** 검증, 렌더 없는 상태 조회, PNG 미리보기, 구간·전체 영상 출력, 게시용 출처 생성.

실제 긴급 서비스에 연결하거나 문자를 발송하지 않습니다. 작품 제목과 필수 허구 고지는 영상 첫 5초에 표시합니다.

## 설치와 시작

**Node.js 22 이상**과 Chromium 실행에 필요한 OS 라이브러리가 필요합니다.

빈 작품 폴더에 npm 패키지를 설치합니다.

```sh
mkdir my-film
cd my-film
npm install disaster-broadcast-studio
npx dbs init
```

`init`은 유효한 `scenario.yaml`, 작품용 `README.md`, `audio/`, `audio-code/`를 만듭니다. 기존 파일과 충돌하면 생성 전에 중단합니다. 작품은 엔진 저장소 밖에서 관리합니다.

창작 AI와 함께 제작한다면 [창작 스킬 설치 안내](skills/README.md)를 따르세요. 스킬에는 집필·연출 지침, 공식 문안 참고자료, 음향 코드 예제가 포함되어 있습니다. 사용자 범위에 한 번 설치하며 `dbs init`과 별도로 관리합니다.

## 첫 영상 만들기

`scenario.yaml`의 제목·기관·컷·이벤트를 수정하고 다음 순서로 확인합니다.

```sh
# 입력·참조·음원·시간 검증
npx dbs validate scenario.yaml

# 8초 지점의 상태와 화면 확인
npx dbs inspect scenario.yaml --frame 480
npx dbs frame scenario.yaml --frame 480 --out preview.png

# 5초 구간을 확인한 뒤 전체 영상 출력
npx dbs render scenario.yaml --from 300 --to 599 --out clip.mp4
npx dbs render scenario.yaml --out film.mp4
```

프레임은 **0부터 시작**하며 구간의 **끝 프레임도 포함**합니다. 300~599는 60fps에서 5초입니다. 컷 안의 시간은 실제 재생 시간과 같고, 컷 경계에서만 시간을 생략할 수 있습니다. 오프닝 이후에 중요한 사건을 배치하고, 읽기 시간 경고가 나오면 문자 사이 간격을 늘리세요.

첫 렌더에서는 Remotion이 Chrome Headless Shell을 다운로드할 수 있습니다. `--browser /path/to/chromium`으로 설치된 브라우저를 지정할 수도 있습니다. 준비 후에는 로컬 지도·글꼴·음원으로 렌더합니다.

Linux에서 소프트웨어 WebGL을 사용하려면 `frame`·`render` 명령에 **`--gl swangle`**을 추가합니다. 기본값은 `--gl angle`, 동시 렌더 수는 `--concurrency 2`입니다. 60fps는 결과 영상 규격이며 렌더 속도는 환경에 따라 달라집니다.

### 결과 파일

| 파일 | 용도 |
| --- | --- |
| `film.mp4` | H.264/yuv420p 영상과 AAC 오디오. 음원이 없어도 무음 트랙 포함 |
| `film.mp4.json` | 작품 정보, 출력 프레임 범위, 자산·출처 기록 |
| `film.mp4.credits.txt` | 영상 게시 설명란에 넣을 출처 문안 |

PNG 출력에도 `.json`과 `.credits.txt`가 함께 생성됩니다. 기존 결과나 부속 파일이 있으면 중단하며, 교체하려면 `--overwrite`를 지정합니다. 오류는 종료코드 1로 반환합니다.

영상 게시 시 **`.credits.txt` 내용을 설명란 등에 함께 제공**하세요. 기본 지도에는 출처를 상시 표시하지 않습니다. 사용자 지도·음원의 추가 표시 조건은 작품별로 확인합니다.

## 시나리오와 음향 작성

정확한 필드와 이벤트 사용법은 [작품 형식·CLI](skills/scenario-writing/references/format.md)에 정리되어 있습니다. `cuts`는 이야기 시각과 길이, `events`는 문자·뉴스·지도·음향의 시점을 정합니다.

```sh
npx dbs schema --out scenario.schema.json
npx dbs regions --search 철원 --json
npx dbs credits scenario.yaml --out description-credits.txt
```

문자 수신음은 기본 제공하며 문자별로 끄거나 교체할 수 있습니다. 작품 고유 음향은 사용권이 있는 로컬 파일을 연결하거나, [Tone.js 음향 가이드](skills/scenario-writing/references/audio.md)에 따라 ES 모듈을 작성해 WAV로 합성합니다.

```sh
npx dbs audio audio-code/sound.mjs --duration 3 --seed 731 --out audio/sound.wav
```

`audio-code/sound.mjs`는 직접 작성하는 파일입니다. 합성 결과 옆 `.json`에는 시드·음량 통계와 Tone.js·Chromium 버전을 기록합니다. 음원 경로는 시나리오 파일을 기준으로 해석하며, 자산마다 출처와 이용조건을 지정합니다.

## 개발

저장소에서 의존성을 설치하고 검증·빌드합니다.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm pack
```

`npm pack`은 설치 가능한 `.tgz`를 만듭니다. 코드와 배포 자산·창작 스킬을 포함하며 실제 작품은 포함하지 않습니다. 렌더 검증용 입력은 `node scripts/render-fixtures.mjs /tmp/dbs-fixtures`로 저장소 밖에 생성할 수 있습니다.

| 문서 | 다루는 내용 |
| --- | --- |
| [SPEC](docs/SPEC.md) | 목표·요구사항 |
| [TECH](docs/TECH.md) | 구현 구조·설계 근거 |
| [PLAN](docs/PLAN.md) | 검증 범위·현재 상태·다음 작업 |
| [창작 스킬](skills/scenario-writing/SKILL.md) | 독립된 창작 AI의 제작 지침 |

## 이용조건

코드는 [MIT](LICENSE)입니다. 지도·글꼴·공통 수신음은 [자산 출처와 이용조건](assets/README.md)을 확인하세요. Remotion에는 [별도 라이선스 조건](https://www.remotion.dev/pricing)이 적용됩니다.
