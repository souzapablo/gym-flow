import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    passWithNoTests: true,
    teardownTimeout: 120_000,
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
        resolve: {
          alias: {
            "@/db/client": resolve(process.cwd(), "test/database/client.ts"),
            "server-only": resolve(process.cwd(), "test/setup/server-only.ts"),
          },
        },
        test: {
          name: "database",
          environment: "node",
          fileParallelism: false,
          globalSetup: ["./test/database/lifecycle.ts"],
          hookTimeout: 120_000,
          include: [
            "src/**/*.integration.test.ts",
            "test/**/*.integration.test.ts",
          ],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
