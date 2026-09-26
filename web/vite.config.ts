import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 개발 중에는 화면(5820)이 API(4820)로 요청을 넘긴다. 배포에서는 API 서버가 빌드된 화면을 함께 내보낸다.
export default defineConfig({
  plugins: [react()],
  server: { port: 5820, proxy: { "/api": "http://127.0.0.1:4820" } },
  test: { globals: true },
});
