import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles.css';
import { App } from './App';

// 해시 없는 경로(/explore, /groups/g01 등)로 직접 접속하면 같은 화면의 해시 주소로 바꾼다.
// 서버(vercel.json)는 모든 경로를 index.html로 재작성하므로 404 없이 이 코드가 실행된다.
const base = import.meta.env.BASE_URL;
const { pathname, search, hash } = window.location;
if (!hash && pathname.startsWith(base) && pathname !== base && pathname !== `${base}index.html`) {
  window.history.replaceState(null, '', `${base}#/${pathname.slice(base.length)}${search}`);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
