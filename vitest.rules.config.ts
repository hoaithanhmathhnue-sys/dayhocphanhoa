import { defineConfig } from 'vitest/config';

// Cấu hình riêng cho test luật Firestore (chạy trong bộ giả lập, môi trường Node).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests-rules/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
