import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 라우팅은 HashRouter를 사용한다. 자산은 절대 경로(/assets/...)로 참조해야
// /groups/g01 같은 깊은 경로로 직접 접속해도 자산 요청이 index.html로 재작성되지 않는다.
// 하위 경로에 배포할 때는 VITE_BASE=/sub/path/ 로 지정한다.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
