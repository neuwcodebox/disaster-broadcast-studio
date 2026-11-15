# 작품 작업공간

`scenario.yaml`에 사건·문안·지도·연출을 작성한다. 창작 AI에게 사용자 범위에 설치한 `scenario-writing` 스킬을 사용하도록 요청한다. 형식과 참고자료는 [GitHub의 창작 스킬](https://github.com/neuwcodebox/disaster-broadcast-studio/tree/main/skills/scenario-writing)에 포함되어 있다. 이 작업공간은 스킬을 별도 복사하지 않는다.

```sh
npx dbs validate scenario.yaml
npx dbs regions --search 철원
npx dbs frame scenario.yaml --frame 600 --out preview.png
npx dbs render scenario.yaml --out film.mp4
```

문자 도착 시 엔진의 공통 수신음이 재생된다. `alert.sound: false`로 끄거나 사용자 음원으로 바꾼다. `audio/`는 작품 고유 음원, `audio-code/`는 필요한 합성 코드를 두는 폴더다. [음향 가이드](https://github.com/neuwcodebox/disaster-broadcast-studio/blob/main/skills/scenario-writing/references/audio.md)를 참고한다.

지역·기관·시각·문안을 작품에 맞게 바꾼다. 컷 내부는 실시간이며 시간 도약은 새 컷으로 지정한다. 결과와 함께 생성한 `.credits.txt`를 영상 게시 설명에 포함한다. 초기화는 npm 설치나 영상 게시를 수행하지 않는다.
