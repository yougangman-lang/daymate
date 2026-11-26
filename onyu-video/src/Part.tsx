import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Audio } from '@remotion/media';
import { staticFile } from 'remotion';
import { Bg, SceneFade, Subtitles } from './components/ui';
import { NO_SUBS, SCENES } from './scenes';
import { Part as PartName, partScenes } from './timeline';

/** 한 파트(소개/운영/마무리)를 장면 순서대로 배치. 음성·자막·화면이 같은 시간표(timeline.ts)를 쓴다. */
export const Part: React.FC<{ part: PartName }> = ({ part }) => {
  const scenes = partScenes(part);
  return (
    <AbsoluteFill style={{ background: '#F6F0E6' }}>
      <Bg />
      {scenes.map((s) => {
        const V = SCENES[s.visual.type];
        const subs = NO_SUBS.has(s.visual.type) ? [] : s.lines.flatMap((l) => l.chunks);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
            <SceneFade dur={s.dur}>
              <V s={s} />
            </SceneFade>
            {s.lines.map((l) => (
              <Sequence key={l.file} from={l.from} durationInFrames={l.dur + 6} name={l.file}>
                <Audio src={staticFile(l.file)} />
              </Sequence>
            ))}
            <Subtitles chunks={subs} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
