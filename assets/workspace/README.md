# 작품 작업공간

`scenario.yaml`에 사건·문안·지도·연출을 작성한다. 창작 AI에게 사용자 범위에 설치한 `scenario-writing` 스킬을 사용하도록 요청한다. 형식과 참고자료는 [GitHub의 창작 스킬](https://github.com/neuwcodebox/disaster-broadcast-studio/tree/main/skills/scenario-writing)에 포함되어 있다. 이 작업공간은 스킬을 별도 복사하지 않는다.

```sh
npx dbs validate scenario.yaml
npx dbs regions --search 철원
npx dbs frame scenario.yaml --frame 600 --out preview.png
npx dbs render scenario.yaml --out film.mp4
```

`audio/`는 완성 음원, `audio-code/`는 합성 코드 폴더다. 수신음 시작점은 다음 명령으로 WAV를 만든다. 생성한 음원을 `scenario.yaml`의 자산·audio 이벤트에 연결하는 방법은 스킬의 `references/audio.md`를 따른다.

```sh
npx dbs audio audio-code/receipt.mjs --duration 0.55 --out audio/receipt.wav
```

지역·기관·시각·문안을 작품에 맞게 바꾼다. 컷 내부는 실시간이며 시간 도약은 새 컷으로 지정한다. 결과와 함께 생성한 `.credits.txt`를 영상 게시 설명에 포함한다. 초기화는 npm 설치나 영상 게시를 수행하지 않는다.
