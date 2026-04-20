import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  envPrefix: ["NEXT_PUBLIC_"],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    exclude: ["node_modules", "tests/e2e/**"],
    env: {
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "shopinglist-dev.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "shopinglist-dev",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "shopinglist-dev.appspot.com",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
      NEXT_PUBLIC_USE_EMULATORS: "false",
    },
  },
});
