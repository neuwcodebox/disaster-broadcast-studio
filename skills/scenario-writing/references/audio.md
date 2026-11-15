# Tone.js 음원 제작

`dbs audio`는 창작자가 작성한 JavaScript 모듈을 Chromium의 Web Audio `Tone.Offline` 안에서 실행해 **PCM16 WAV**로 저장한다. Python이나 별도 Tone.js 설치는 필요 없다. Tone.js는 도구 의존성에 고정되어 있다. 완성 WAV를 일반 `assets`와 `audio` 이벤트에 연결하므로 영상 출력 때 합성 코드를 다시 실행하지 않는다.

## 소리의 출처와 시청자

소리를 추가하기 전에 서비스의 알림음, 방송에 포함된 현장·취재 음성, 작품의 배경음 중 무엇인지 정한다. 방송 속 소리는 누가 어디서 내며 어떤 경로로 송출에 포함되는지, 배경음은 장면에서 어떤 정서와 의미를 만드는지 맞춘다. 각 소리의 역할이 화면의 정보와 충돌하지 않아야 한다.

시청자는 재생 기기와 자신의 주변 환경에서 영상을 듣는다. 시청자가 소리의 출처와 의미를 어떻게 받아들일지 검토하고, 작중 상황·서비스 동작·시청자의 실제 환경 사이의 관계가 연출 의도에 맞는지 확인한다. 기본음에도 같은 기준을 적용하며 작품의 맥락에 따라 이벤트의 `sound`로 끄거나 교체한다. 합성한 파일만 듣지 말고 실제 화면과 함께 재생해 판단한다.

## 실행 가능한 시작점

상태 변경·방송 안내·등급별 문자 수신음은 엔진 기본 기능이며 작품마다 생성하지 않는다. 뉴스는 기본 무음이며 `sound: default` 또는 사용자 음원을 명시한 경우에만 소리를 재생한다. 상태 변경음은 화면 교체 시작에 같은 높이로 두 번 울리는 0.3초의 짧은 전자음이다. 안전안내는 0.55초의 휴대폰 진동형 수신음, 긴급재난은 2.4초의 반복 경보, 위급재난은 4.2초의 더 강한 반복·지속 경보다. 긴급·위급은 EAS풍의 불협화음으로 합성했다. `alert`, `status`, `news`, `bulletin`에서 `sound: false`로 끄거나 `{asset, duration, volume}`으로 다른 음원을 연결한다. 기본음과 별도 `audio` 이벤트를 중복하지 않는다. `silence`는 기본음도 음소거한다.

아래 합성은 작품 고유 음향이 필요한 경우에 사용한다. 스킬의 `examples/receipt.mjs`를 `src/audio/receipt.mjs`로 직접 복사해 실행할 수 있다. CC0-1.0의 합성 예제이며 실제 정부 경보음이 아니다.

```sh
npx dbs audio src/audio/receipt.mjs \
  --duration 0.55 --channels 1 --seed 731 --out output/audio/receipt.wav
```

직접 작업공간을 구성했다면 스킬의 예제를 복사하거나 모듈을 작성하고 경로를 맞춘다. 명령의 입력·출력·`--assets` 경로는 **현재 작업 폴더 기준**이다. 모듈 내부의 상대 `import`는 **그 모듈 기준**으로 번들된다. `.mjs`를 권장하며 `.js`도 지원한다. 음향 코드 역시 실행 코드이므로 작성·확인한 로컬 모듈을 실행한다.

## 모듈 계약

기본 내보내기는 다음 함수를 사용한다. 이 함수가 만드는 노드와 예약한 소리가 출력에 포함된다.

```js
export default async function ({ Tone, context, duration, sampleRate, channels, seed, random, asset }) {
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.02, decay: 0.08, sustain: 0, release: 0.1 },
  }).toDestination();
  synth.volume.value = -18;
  synth.triggerAttackRelease(440, 0.15, 0);
  synth.triggerAttackRelease(330, 0.15, 0.35);
}
```

- `Tone`은 설치된 Tone.js 모듈이고 `context`는 현재 OfflineContext다. 별도로 `Tone.Offline`을 중첩 호출하거나 `Tone.start()`·마이크·스피커·GUI를 사용하지 않는다.
- 시간은 음원 시작 기준 **초**다. `start(0)`처럼 예약한다. Transport를 쓰면 `context.transport.start(0)`도 지정한다. `setTimeout`·벽시계로 재생을 기다리지 않는다.
- `duration`에는 잔향·릴리즈까지 포함한다. 종료 이후의 소리는 잘린다. 예약한 노드를 렌더 완료 전에 `dispose()`하면 소리가 사라질 수 있다.
- `random()`은 시드 기반 난수다. Tone를 불러오기 전 `Math.random`도 시드로 초기화한다. 모듈 최상위에서 난수를 뽑지 말고 함수 안에서 생성한다. `Date.now()`·네트워크 응답을 제작 변수로 쓰지 않는다.
- `channels`는 1 또는 2, 기본 2다. `sampleRate` 기본 48000Hz, `seed` 기본 1이다. 사용자 지정 샘플레이트의 지원 여부는 Chromium Web Audio에 따른다.

## 로컬 샘플

직접 합성 이외에 사용 허가를 확보한 로컬 샘플도 읽을 수 있다.

```sh
npx dbs audio src/audio/sound.mjs --assets src/audio/samples --duration 3 --out output/audio/result.wav
```

```js
export default async function ({ Tone, asset }) {
  const player = new Tone.Player(asset('licensed-sample.wav')).toDestination();
  await Tone.loaded();
  player.start(0);
}
```

`asset()`에는 `--assets` 폴더 안의 상대 경로를 준다. 샘플의 라이선스·출처는 작품 `assets`에 기록한다. URL 샘플에 의존하지 않는다. 추가 JavaScript 라이브러리는 작품 워크스페이스에 설치하고 해당 모듈에서 가져올 수 있으나, Node 전용 기능은 브라우저에서 실행되지 않는다.

## 결과 확인과 영상 연결

성공하면 WAV와 옆의 `.wav.json`이 생성된다. 기록에는 길이·샘플레이트·채널·시드·Tone 버전·실제 Chromium 버전·피크·RMS·클리핑 샘플 수가 들어간다. 모듈과 생성 명령, 원본 샘플, 사용한 도구 패키지를 작품과 함께 보관한다. 같은 버전·환경·시드는 재현 기준이며 다른 브라우저·하드웨어 사이의 비트 단위 일치를 약속하지 않는다.

`--overwrite` 없이 기존 WAV를 덮어쓰지 않는다. 문법·모듈·샘플 로딩·합성 오류는 실패로 반환하고 미완성 WAV를 결과로 남기지 않는다. 피크 초과는 PCM 범위로 자르고 경고한다. 소리가 0이면 경고한다. 음원을 들어 보고 게인을 조정하며, 클리핑·무음 경고를 성공적인 연출로 착각하지 않는다.

```yaml
assets:
  customTone:
    path: output/audio/receipt.wav
    source: 작품 고유 합성음. src/audio/receipt.mjs 참조.
    license: CC0-1.0
events:
  - id: notice-1
    type: alert
    cut: first
    at: 7
    sender: city
    text: 다음 안내를 기다려 주십시오.
    regions: []
    sound:
      asset: customTone
      duration: 0.55
      volume: 0.8
```

WAV 생성과 영상 타임라인은 별개다. 음원 길이·이벤트 길이·offset·페이드·침묵 구간을 실제 구간 영상에서 함께 확인한다. 기존 WAV/FLAC 등 파일도 그대로 사용할 수 있다. 파일 재생의 `audio.loop`·`playbackRate`로 원본 offset 이후 구간의 반복·속도를 지정할 수 있으며, 페이드·길이·침묵은 영상 시간을 따른다. 반복마다 페이드가 다시 시작되지 않는다. 정확한 필드와 예시는 [음향·화면 효과](format.md#음향화면-효과)를 참고한다.

## 원천 자료

- [Tone.js Offline API](https://tonejs.github.io/docs/15.0.4/functions/Offline.html): Offline callback과 예약 시간, 채널·샘플레이트.
- [Tone.js 소스·MIT 라이선스](https://github.com/Tonejs/Tone.js): 실제 설치 버전은 출력 기록에 보존.
- [Remotion Artifact](https://www.remotion.dev/docs/artifact): 브라우저에서 만든 바이트를 로컬 파일로 반환하는 경로.
