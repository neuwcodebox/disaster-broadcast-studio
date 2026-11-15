import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Player, type PlayerRef } from '@remotion/player';
import { Broadcast } from '../video/Broadcast.js';
import { FPS } from '../scenario.js';
import { notificationSounds } from '../notifications.js';
import type { PreviewSnapshot, PreviewStatus } from './project.js';

async function readJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw Error(`미리보기를 불러오지 못했습니다 (${response.status}).`);
  return response.json() as Promise<T>;
}

function Preview() {
  const player = useRef<PlayerRef>(null);
  const revision = useRef(0);
  const [snapshot, setSnapshot] = useState<PreviewSnapshot>();
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [initialFrame, setInitialFrame] = useState(0);
  const [frame, setFrame] = useState(0);
  const [target, setTarget] = useState('0');
  const audioTags = useMemo(() => {
    if (!snapshot) return 5;
    const timeline = snapshot.props.timeline;
    const spans = [
      ...notificationSounds(timeline).map(sound => ({ start: sound.start, end: sound.start + sound.frames })),
      ...timeline.events.filter(event => event.type === 'audio'),
    ];
    const changes = spans.flatMap(span => [[span.start, 1], [span.end, -1]])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let active = 0, maximum = 5;
    for (const [, delta] of changes) maximum = Math.max(maximum, active += delta);
    return maximum;
  }, [snapshot]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const status = await readJson<PreviewStatus>('/api/status', controller.signal);
        setError(status.error);
        if (status.revision !== revision.current) {
          const next = await readJson<PreviewSnapshot>('/api/scenario', controller.signal);
          const position = Math.min(player.current?.getCurrentFrame() ?? 0, next.props.timeline.durationInFrames - 1);
          player.current?.pause();
          setInitialFrame(position);
          setFrame(position);
          setTarget(String(position));
          revision.current = next.revision;
          setSnapshot(next);
        }
        setConnected(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        setConnected(false);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 750);
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const update = ({ detail }: { detail: { frame: number } }) => setFrame(detail.frame);
    current.addEventListener('frameupdate', update);
    return () => current.removeEventListener('frameupdate', update);
  }, [snapshot?.revision]);

  const seek = (value: number) => {
    if (!snapshot || !Number.isFinite(value)) return;
    const position = Math.max(0, Math.min(Math.round(value), snapshot.props.timeline.durationInFrames - 1));
    player.current?.pause();
    player.current?.seekTo(position);
    setFrame(position);
    setTarget(String(position));
  };

  return <main className="preview">
    <header>
      <h1>{snapshot?.props.timeline.scenario.title ?? '재난방송실'} · 미리보기</h1>
      <span role="status" className="status">{!connected ? '서버 연결 끊김 · 재연결 대기 중' : error ? '수정 대기 중' : snapshot ? '저장하면 자동 반영' : '불러오는 중…'}</span>
    </header>
    {error && <p role="alert" className="error">{`입력을 확인해 주세요. 마지막 정상 화면을 유지합니다.\n${error}`}</p>}
    {snapshot && <>
      <div className="player">
        <Player key={snapshot.revision} ref={player} component={Broadcast}
          inputProps={snapshot.props} durationInFrames={snapshot.props.timeline.durationInFrames}
          compositionWidth={1920} compositionHeight={1080} fps={FPS}
          initialFrame={initialFrame} controls clickToPlay doubleClickToFullscreen
          numberOfSharedAudioTags={audioTags}
          moveToBeginningWhenEnded={false} style={{ width: '100%' }}
          errorFallback={({ error }) => <div role="alert" className="error">{`화면을 표시하지 못했습니다.\n${error.message}`}</div>}
        />
      </div>
      <div className="tools">
        <button onClick={() => seek(frame - 1)} aria-label="이전 프레임">← 1프레임</button>
        <button onClick={() => seek(frame + 1)} aria-label="다음 프레임">1프레임 →</button>
        <form onSubmit={event => { event.preventDefault(); seek(Number(target)); }}>
          <label>프레임 <input aria-label="이동할 프레임" type="number" min="0" max={snapshot.props.timeline.durationInFrames - 1}
            value={target} onChange={event => setTarget(event.target.value)} /><button type="submit">이동</button></label>
        </form>
        <label>컷 <select aria-label="컷으로 이동" value="" onChange={event => seek(Number(event.target.value))}>
          <option value="" disabled>컷 선택</option>
          {snapshot.props.timeline.cuts.map(cut => <option key={cut.id} value={cut.start}>{cut.id}</option>)}
        </select></label>
        <output aria-label="현재 프레임">{frame} / {snapshot.props.timeline.durationInFrames - 1} · {(frame / FPS).toFixed(2)}초</output>
      </div>
      {snapshot.warnings.length > 0 && <p className="warnings">{snapshot.warnings.join('\n')}</p>}
      <p>재생 버튼으로 화면과 음향을 확인하세요. 시나리오·지도·음원을 저장하면 현재 위치에서 일시정지한 뒤 반영합니다. 종료: 터미널에서 Ctrl+C</p>
    </>}
  </main>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
