# npm 첫 공개 게시

## 게시 대상과 준비

사용자의 명시적 요청에 따라 `disaster-broadcast-studio@0.1.0`을 npm 공용 레지스트리에 공개 게시했다. 관련 요구는 F5, F6, N3이며 기존 P4·P5 배포 경계에 해당한다.

- README와 배포용 작품 형식 문서의 기본 설치 명령을 `npm install disaster-broadcast-studio`로 정리했다. 소스 기준 커밋은 `ecb7468`이다.
- 전체 8개 테스트 파일, 타입 검사와 빌드를 통과했다.
- 최종 tgz는 75개 파일, 7,738,813바이트다. 빌드 모듈·지도·수신음·창작 스킬·README·라이선스를 포함하고 소스·테스트·임시 결과는 제외했다.
- 동일 tgz로 `npm publish --dry-run --access public`을 통과했으며 패키징 결과와 예행연습 결과의 무결성 값이 일치하는지 확인했다.
- npm 계정은 `neuwnpmbox`다. 최초 대화형 인증에서 브라우저 자동 열기 오류가 발생해, `--browser=false`로 재시작하고 사용자가 새 링크에서 본인 인증을 완료했다.

## 게시 결과

게시 요청은 HTTP 202와 CLI 성공 응답을 반환했다. 공개 반영 전에는 레지스트리에 `0.0.0-stage` 임시 패키지만 보였고 승인 대기 목록은 비어 있었다. 캐시를 우회한 조회로 실제 반영을 추적해, 2026-11-15 15:59:05 KST에 `0.1.0`이 공개되고 `latest`로 지정된 것을 확인했다. 명령 성공 응답과 공개 설치 가능 상태를 구분했다.

- 공개 주소: https://www.npmjs.com/package/disaster-broadcast-studio
- 공개 레지스트리의 `0.1.0` 무결성 값이 최종 tgz와 일치했다: `sha512-9Hmr+PeraBXl6Z5fraXZJ851mbETgNUiJZObnV50kFJONF+hDMLUDT8B89UqpY928ClveKeS6t9F9miyDn+lyw==`.
- 새 설치 폴더에서 공개 레지스트리의 `disaster-broadcast-studio@0.1.0`을 설치했다. `dbs --version`이 `0.1.0`을 반환했고, `dbs init`으로 만든 30초 작품이 `dbs validate`에서 경고 없이 통과했다.
- 기본 설치 경로를 npm으로 정리했으며, 이후 버전은 동일한 이름·버전 조합을 재사용하지 않고 새 버전으로 게시한다.

## README 이미지 배포 보정: 0.1.1

비공개 GitHub 저장소의 `raw.githubusercontent.com` 이미지 주소는 인증 없는 요청에 404를 반환해 GitHub와 npm의 README 미리보기에서 표시되지 않았다. 기술 검증 스크린샷을 `assets/preview.png`로 옮겨 npm 패키지에 동봉하고, README는 `https://cdn.jsdelivr.net/npm/disaster-broadcast-studio@0.1.1/assets/preview.png`를 사용하도록 수정했다. 기존 개발 이력의 스크린샷 링크도 새 경로로 연결했다. 저장소 공개 설정은 변경하지 않았다.

`0.1.1`의 빌드·타입 검사·게시 예행연습을 통과했으며 이미지가 실제 tgz에 포함되는지 확인했다. 사용자 npm 인증 후 공개 반영을 기다려 `latest: 0.1.1`과 배포물 무결성·README 주소를 검증했다. 정확한 CDN 이미지 URL은 인증 없이 HTTP 200과 `image/png`를 반환했고, 내려받은 358,290바이트 PNG가 원본과 일치했다. 소스 기준 커밋은 `52f8514`다.
