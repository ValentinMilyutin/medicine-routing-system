import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/ui/**/*.test.tsx"],
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
