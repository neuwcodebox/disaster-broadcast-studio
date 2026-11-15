# 작품 작업공간

`scenario.yaml`에 사건·문안·지도·연출을 작성한다. 창작 AI에게 사용자 범위에 설치한 `scenario-writing` 스킬을 사용하도록 요청한다. 형식과 참고자료는 [GitHub의 창작 스킬](https://github.com/neuwcodebox/disaster-broadcast-studio/tree/main/skills/scenario-writing)에 포함되어 있다. 이 작업공간은 스킬을 별도 복사하지 않는다.

| 경로 | 용도 |
| --- | --- |
| `scenario.yaml` | 작품의 시나리오와 연출 |
| `audio/` | 작품에서 참조할 음원과 합성 기록 |
| `audio-code/` | 음원 생성 코드 |
| `output/` | 완성·구간 영상, 프레임 이미지, 검토 자료, 게시용 출처 등 산출물 |

아래 명령은 이 작품 폴더에서 실행한다. `--out`으로 산출물 경로를 지정하며, 영상·이미지의 `.json`·`.credits.txt`는 결과 파일 옆에 함께 생성된다.

```sh
npx dbs validate scenario.yaml
npx dbs preview scenario.yaml
npx dbs regions --search 철원
npx dbs frame scenario.yaml --frame 600 --out output/preview.png
npx dbs render scenario.yaml --out output/film.mp4
```

`preview`의 로컬 주소를 브라우저에서 열면 영상 출력 없이 화면·음향을 재생하고 프레임·컷을 탐색할 수 있다. 시나리오·지도·음원 저장 시 현재 위치에서 일시정지해 반영하며, 오류가 있으면 마지막 정상 화면을 유지한다. 종료는 터미널에서 Ctrl+C다.

문자 도착 시 엔진의 공통 수신음이 재생된다. `alert.sound: false`로 끄거나 사용자 음원으로 바꾼다. 작품 고유 음원의 제작은 [음향 가이드](https://github.com/neuwcodebox/disaster-broadcast-studio/blob/main/skills/scenario-writing/references/audio.md)를 참고한다.

지역·기관·시각·문안을 작품에 맞게 바꾼다. 컷 내부는 실시간이며 시간 도약은 새 컷으로 지정한다. 결과와 함께 생성한 `.credits.txt`를 영상 게시 설명에 포함한다. 초기화는 npm 설치나 영상 게시를 수행하지 않는다.
