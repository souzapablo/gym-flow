import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.unit.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/components/**/*.integration.test.tsx"],
          setupFiles: ["./test/setup/component.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "database",
          environment: "node",
          fileParallelism: false,
          include: [
            "src/**/*.integration.test.ts",
            "test/**/*.integration.test.ts",
          ],
        },
      },
    ],
  },
});
