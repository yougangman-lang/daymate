import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BrowserRouter를 사용한다. 자산은 절대 경로로 빌드되어 /member/body 같은 깊은 경로에서도 로드된다.
// 하위 경로 배포 시 VITE_BASE=/sub/ 로 지정한다.
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
