import React from 'react';
import { Composition } from 'remotion';
import './fonts';
import { Part } from './Part';
import { Consultation, consultDuration } from './Consultation';
import { partDuration } from './timeline';
import { FPS, H, W } from './theme';

export const Root: React.FC = () => (
  <>
    <Composition id="Intro" component={Part} defaultProps={{ part: 'intro' as const }} durationInFrames={partDuration('intro')} fps={FPS} width={W} height={H} />
    <Composition id="Operations" component={Part} defaultProps={{ part: 'operations' as const }} durationInFrames={partDuration('operations')} fps={FPS} width={W} height={H} />
    <Composition id="Closing" component={Part} defaultProps={{ part: 'closing' as const }} durationInFrames={partDuration('closing')} fps={FPS} width={W} height={H} />
    <Composition id="Consultation" component={Consultation} durationInFrames={consultDuration()} fps={FPS} width={W} height={H} />
  </>
);
