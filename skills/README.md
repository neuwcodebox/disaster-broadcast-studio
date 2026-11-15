# 창작 스킬 설치

[scenario-writing](scenario-writing/SKILL.md)은 Agent Skills 형식의 독립 스킬이다. 스킬·참고자료·예제의 정본은 `skills/scenario-writing`이다. 작품 파일과 엔진 개발 지침은 포함하지 않는다.

## 사용자 범위에 한 번 설치

Vercel의 공통 `skills` CLI로 Codex와 Claude Code에 설치한다. 이 명령은 두 AI 제품 자체의 내장 명령이 아닌 별도 공개 도구다.

```sh
npx skills add https://github.com/neuwcodebox/disaster-broadcast-studio/tree/main/skills/scenario-writing -g -a codex claude-code
```

Codex만 사용하면 `-a codex`, Claude Code만 사용하면 `-a claude-code`로 지정한다. 사용자 범위는 해당 컴퓨터의 여러 작품에서 함께 사용하며 작품마다 복사하지 않는다. Codex는 `~/.agents/skills`, Claude Code는 `~/.claude/skills`를 읽는다. 공통 설치 도구는 정본과 도구별 심볼릭 링크 또는 복사본을 관리한다. 심볼릭 링크를 사용하지 않으려면 설치 명령에 `--copy`를 더할 수 있다.

저장소가 비공개이면 Git·GitHub CLI·SSH 중 해당 저장소에 접근할 수 있는 인증이 필요하다. 공개 저장소와 명령 형식은 같다. 사용자 범위 로컬 설치는 다른 컴퓨터나 클라우드 세션에 자동 전파되는 계정 설정이 아니다.

## 갱신

```sh
npx skills update scenario-writing -g
```

스킬 갱신은 npm CLI 패키지 갱신과 별개다. 이름을 지정해 이 스킬만 갱신한다. 설치된 스킬을 직접 편집했다면 먼저 별도 위치에 변경을 보관하고 비교한 뒤 갱신한다. 외부 설치 도구가 모든 로컬 수정을 자동 병합한다고 가정하지 않는다. 이후 AI에서 스킬을 다시 불러오며 반영되지 않으면 새 세션에서 확인한다.

## 주소로 직접 읽기

설치하지 않을 때는 AI에게 다음 주소를 주고 `SKILL.md`와 필요한 상대 참조를 함께 읽도록 요청할 수 있다.

https://github.com/neuwcodebox/disaster-broadcast-studio/blob/main/skills/scenario-writing/SKILL.md

단순 링크 참조는 AI의 사용자 스킬 목록에 등록되지 않는다. AI가 접근 가능한 GitHub 도구나 웹 읽기 기능이 필요하고 비공개 저장소에는 접근 권한이 있어야 한다. 참고자료는 같은 폴더 아래의 상대 링크이며, GitHub에서도 파일 위치를 기준으로 따라갈 수 있다. 설치본은 이 파일들을 로컬에서 읽는다.

## npm 패키지의 사본

npm 패키지도 스킬·참고자료·예제를 포함한다. 인터넷 없이 패키지에 동봉된 판본을 꺼내거나 지원하지 않는 AI 도구에 수동 전달하려면 다음 내보내기를 사용할 수 있다.

```sh
npx dbs skill --out ./exported-scenario-writing
```

이는 파일 내보내기이며 설치·자동 갱신 관리자가 아니다. 기존 출력은 덮어쓰지 않는다. 일반적인 사용자 공통 설치에는 위 GitHub 설치 명령을 사용한다. `dbs init`은 작품 폴더·YAML·음향 코드 시작점만 만들며 스킬은 설치하지 않는다.

## 공식 근거

- [Vercel skills CLI 명령·비공개 저장소·갱신](https://github.com/vercel-labs/skills/blob/main/docs/commands.md)
- [Codex의 로컬 스킬 범위](https://learn.chatgpt.com/docs/build-skills)
- [Claude Code의 스킬 위치·참고자료](https://code.claude.com/docs/en/skills)
