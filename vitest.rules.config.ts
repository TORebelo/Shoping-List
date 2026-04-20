import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/rules/**/*.test.ts"],
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Rules tests share the emulator and a single Firestore project;
    // parallel files cause one suite's clearFirestore() to wipe another
    // suite's seed data mid-test.
    fileParallelism: false,
  },
});
