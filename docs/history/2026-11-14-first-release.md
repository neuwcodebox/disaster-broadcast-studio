# P1–P5 — 독립 CLI와 방송 렌더러

관련 요구: F1~F6, N1~N4.

## 구현과 판단

YAML/JSON을 검증한 뒤 60fps 프레임 타임라인으로 정규화한다. 동일한 상태 계산을 PNG·구간·전체 영상이 사용한다. 지도는 기존 재난 대시보드의 시군구 경계와 Natural Earth를 로컬 제공한다. MapLibre 6의 ES 모듈 워커와 공용 모듈도 로컬 자산으로 명시해 CDN이나 번들러의 추정 워커 경로에 의존하지 않는다.

Remotion을 그대로 영상 엔진으로 쓰고 npm CLI `dbs`를 제공한다. 독립 창작 스킬에는 파일 형식·실제 명령과 기존 공식 참고자료를 포함한다. 실제 작품 대신 기술 검증 데이터 생성 스크립트만 저장소에 둔다.

## 확인한 계약

- `npm test`, `npm run typecheck`, `npm run build` 성공. 컷 내부 실시간·컷 시각 도약·임의 탐색·참조 오류·정정·연출 충돌·페이지 전문 보존·외부 자산 해석을 확인했다.
- `npm pack` 결과를 빈 외부 폴더에 설치해 스킬 전체를 내보내고 서로 다른 두 외부 입력을 검증했다. 동봉 스킬의 상대 링크가 모두 해소됐다.
- Linux x64, Node.js 24.22.1, Chrome Headless Shell 158, `--gl swangle`에서 1080p 한글 프레임을 출력해 지도·지역 강조·뉴스·정정 문자·보조 지도와 장문 페이지를 확인했다. [출력 프레임](../screenshots/broadcast.png).
- 첫 입력의 전체 8초, 두 번째 입력의 전체 5초를 엔진 변경 없이 출력했다. 두 번째는 외부 설치본 CLI를 사용했다. `ffprobe`에서 H.264, 1920×1080, 60fps, AAC 트랙을 확인했다.
- 첫 입력의 300~359프레임 구간을 외부 설치본에서 출력했다. 전체 영상의 같은 구간과 표시·카메라·시간이 맞았고, 지정된 첫 0.5초 침묵과 이후 음원 재개를 실제 PCM에서 확인했다. 전체 영상의 페이드 아웃도 반영됐다.

## 재현

```sh
npm ci
npm test
npm pack
node scripts/render-fixtures.mjs /tmp/dbs-fixtures
# 별도 폴더에 생성된 tgz를 설치한 뒤
npx dbs validate /tmp/dbs-fixtures/first.json
npx dbs frame /tmp/dbs-fixtures/first.json --frame 240 --out first.png --gl swangle
npx dbs render /tmp/dbs-fixtures/first.json --out first.mp4 --gl swangle
npx dbs render /tmp/dbs-fixtures/first.json --from 300 --to 359 --out clip.mp4 --gl swangle
npx dbs render /tmp/dbs-fixtures/second.json --out second.mp4 --gl swangle
```

실행 환경은 네트워크 인터페이스 열거가 제한되어, 확인된 localhost 주소를 돌려주는 검증용 preload를 저장소 밖에서 사용했다. 일반 Chromium은 이 환경의 Unix 소켓 제약으로 시작되지 않아 공식 Headless Shell을 사용했다. 이 환경 보정은 배포 코드에 넣지 않았다. 브라우저 다운로드도 Node 프록시 시간 초과로 일반 HTTPS 다운로드를 이용해 준비했다.

## 범위

Windows/macOS·다른 GPU 조합은 직접 실행하지 않았다. 해당 환경의 Chromium 라이브러리·WebGL 설정은 로컬에서 확인한다. 실제 호러 작품 집필, 공개 npm 게시, 영상 외부 업로드는 수행하지 않았다.
