// Pretendard(본문)·Noto Serif KR(워드마크)를 npm 패키지에서 불러오고, 렌더 전에 한글 글리프 로드를 기다린다.
import 'pretendard/dist/web/static/pretendard.css';
import '@fontsource/noto-serif-kr/700.css';
import { continueRender, delayRender } from 'remotion';

const SAMPLE = '온:遊 온유 함께 움직이는 즐거움 가나다 0123456789 ㎡%';
const handle = delayRender('fonts');
Promise.all([
  ...[400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px Pretendard`, SAMPLE)),
  document.fonts.load(`700 40px "Noto Serif KR"`, '온:遊'),
])
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch((e) => {
    console.error(e);
    continueRender(handle);
  });
