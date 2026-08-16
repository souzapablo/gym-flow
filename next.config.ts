import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack(config) {
    if (process.env.GYM_FLOW_E2E === "1") {
      const e2eClient = resolve(process.cwd(), "test/database/e2e-client.ts");
      config.resolve.alias["@/db/client$"] = e2eClient;
      config.resolve.alias[resolve(process.cwd(), "src/db/client.ts")] =
        e2eClient;
    }

    return config;
  },
};

export default nextConfig;
