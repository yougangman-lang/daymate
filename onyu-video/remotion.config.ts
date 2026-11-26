import { Config } from '@remotion/cli/config';

// 1920x1080 / 30fps / H.264(yuv420p) + AAC
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setCrf(16);
Config.setAudioCodec('aac');
Config.setAudioBitrate('192k');
Config.setConcurrency(4);
// 컨테이너에 설치된 Chromium Headless Shell 사용 (다른 환경에서는 이 줄을 지우면 Remotion이 직접 내려받음)
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);
