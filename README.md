# 재난방송실 · Disaster Broadcast Studio

텍스트 시나리오를 한국형 재난방송 호러 영상으로 만드는 CLI. 지도·재난문자 이력·뉴스·시간·음향을 하나의 작품 파일로 지정하고 1080p 60fps MP4로 출력한다.

- 남한 시군구 경계와 한반도 지도, 지역 강조·지점·보조 지도
- 문자 전문·정정 이력·독립 뉴스 헤드라인
- 컷 내부 실시간, 컷 사이 시간 도약, 프레임 지정 탐색
- 로컬 지도·한글 글꼴·음원, 페이드·침묵·화면 간섭
- 엔진과 분리해서 배포할 창작 AI용 스킬·공식 문안 참고자료

## 설치

Node.js 22 이상과 Chromium 실행에 필요한 OS 라이브러리를 사용한다. npm 공개 게시는 아직 하지 않았다. 제공된 패키지 또는 이 저장소에서 만든 패키지를 설치한다.

```sh
npm ci
npm run build
npm pack
# 별도 작품 폴더에서
npm install /path/disaster-broadcast-studio-0.1.0.tgz
npx dbs skill --out .agents/skills/scenario-writing
```

창작 AI에게 설치한 스킬을 사용하도록 요청하고 작품은 엔진 저장소 밖에 만든다. 스킬 전체를 별도로 복사해 전달해도 된다. [작품 형식·CLI](skills/scenario-writing/references/format.md)가 독립된 사용 설명서다.

## 제작

```sh
npx dbs schema --out scenario.schema.json
npx dbs regions
npx dbs validate scenario.yaml
npx dbs frame scenario.yaml --frame 360 --out preview.png
npx dbs render scenario.yaml --from 300 --to 599 --out clip.mp4
npx dbs render scenario.yaml --out film.mp4
```

YAML/JSON의 `cuts`에 이야기 시작 시각과 길이, `events`에 문자·뉴스·지도·음향을 지정한다. 컷 안은 실시간으로 흐르고 컷 경계에서만 시간을 생략한다. 프레임은 0부터 시작하며 구간의 끝 프레임도 포함한다. 300~599는 5초다.

기본 출력은 H.264/AAC MP4, 1920×1080, 60fps다. 음원이 없는 작품도 무음 오디오 트랙을 포함한다. 처음 3초에는 작품 제목과 필수 허구 고지를 표시한다. 긴 문자는 전문을 페이지로 나누고, 최신 문자와 이전 이력을 함께 표시한다. 읽기 시간 경고가 나오면 다음 문자까지 간격을 늘린다.

`--browser /path/to/chromium`으로 설치된 브라우저를 사용할 수 있다. 생략 시 Remotion이 Chrome Headless Shell을 관리하며 최초 준비에 네트워크가 필요하다. 준비 후 출력은 원격 지도·API를 사용하지 않는다. 기본 GPU 백엔드는 `angle`, Linux CPU 렌더링에는 `--gl swangle`을 지정한다. `--concurrency` 기본값은 2다. 60fps는 영상 규격이며 실시간 렌더 속도를 의미하지 않는다.

기존 출력은 `--overwrite` 없이는 덮어쓰지 않는다. 오류는 종료코드 1과 파일·필드 위치로 반환한다. 성공한 출력 옆 `.json`에 작품·출력 범위·자산 출처를 남긴다.

## 개발

```sh
npm test
npm run typecheck
npm run build
```

테스트는 시간·참조·외부 작품 입력 계약을 빠르게 확인한다. 실제 렌더 검증용 데이터는 `node scripts/render-fixtures.mjs /tmp/dbs-fixtures`로 저장소 밖에 생성한다. 실제 작품은 이 저장소에 보관하지 않는다.

- [SPEC](docs/SPEC.md): 목표·요구사항
- [TECH](docs/TECH.md): 구현 구조·선택 근거
- [PLAN](docs/PLAN.md): 현재 상태·남은 작업
- [창작 스킬](skills/scenario-writing/SKILL.md): 별도 창작 AI가 사용하는 지침

## 이용조건

코드는 MIT. [지도·글꼴 이용조건](assets/README.md)과 스킬에 인용된 자료의 출처를 함께 확인한다. Remotion은 [사용 주체별 라이선스 조건](https://www.remotion.dev/pricing)이 적용된다. 이 도구는 허구 영상 파일을 제작하며 실제 긴급 서비스에 연결하거나 문자를 발송하지 않는다.
