# 기본 효과음

프로젝트에서 직접 합성한 CC0-1.0 음향이다. PCM16·48kHz·모노 WAV를 패키지에 포함하며 영상 출력 때는 파일을 재생한다. 긴급·위급재난은 EAS풍의 두 주파수 불협화음과 반복 패턴을 사용한다.

| 파일 | 용도 | 길이 | 엔진 볼륨 |
| --- | --- | --- | --- |
| `notification.wav` | 안전안내, 부드러운 하강 2음 | 0.55초 | 0.65 |
| `alert-urgent.wav` | 긴급재난, 경보 3회 | 2.4초 | 0.85 |
| `alert-critical.wav` | 위급재난, 빠른 경보 3회와 지속음 | 4.2초 | 0.95 |
| `status.wav` | 상태 등장·변경·해제, 짧은 상승 2음 | 0.38초 | 0.65 |
| `news.wav` | 뉴스 시작, 상승 3음 | 0.7초 | 0.65 |
| `bulletin.wav` | 방송 안내 시작, 2단 화음 | 1초 | 0.7 |

같은 이름의 `.mjs`가 합성 소스이고 `tones.mjs`는 공통 파형·엔벌로프다. `.wav.json`에는 합성 조건·버전·음량 통계를 기록한다. 파일·길이·재생 볼륨의 기준은 `src/notifications.ts`다. 패키지 루트에서 전체를 재생성한다.

```sh
npm run build
node scripts/build-audio-assets.mjs
```

`alert`, `status`, `news`, `bulletin`의 `sound: false`로 끄거나 `{asset, duration, volume}`으로 교체한다. 같은 상태의 연속 표시는 재알림하지 않고, 교체 시 새 상태의 설정을 따른다. `silence`는 기본 효과음도 음소거한다.
