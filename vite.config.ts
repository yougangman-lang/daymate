import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 정적 호스팅 어디서나 동작하도록 상대 경로로 빌드한다 (라우팅은 HashRouter 사용).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
