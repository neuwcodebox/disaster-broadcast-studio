# 공통 수신음

`notification.wav`는 이 프로젝트가 Tone.js로 직접 합성한 창작 알림음이다. 실제 재난 경보음을 재현하지 않는다. PCM16·48kHz·모노·0.55초. CC0-1.0.

소스는 `notification.mjs`다. 패키지 루트에서 재생성한다.

```sh
node dist/cli.js audio assets/audio/notification.mjs --duration 0.55 --channels 1 --seed 731 --out assets/audio/notification.wav --overwrite
```
