import { spawn, type ChildProcess } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";

import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";

import { applyMigrations } from "../database/lifecycle";

const POSTGRES_IMAGE = "postgres:18-alpine";
const TEST_DATABASE_NAME = "gym_flow_test";

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const port =
    typeof address === "object" && address ? address.port : undefined;
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );

  if (!port) {
    throw new Error("Unable to reserve an E2E server port");
  }

  return port;
}

function captureOutput(child: ChildProcess) {
  let output = "";
  const append = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-20_000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  return () => output;
}

async function waitForServer(
  url: string,
  cookie: string,
  child: ChildProcess,
  output: () => string,
) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Next.js exited before readiness (${child.exitCode})\n${output()}`,
      );
    }

    try {
      const response = await fetch(url, { headers: { cookie } });
      if (response.ok) return;
    } catch {
      // The server has not opened its socket yet.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }

  throw new Error(`Next.js did not become ready within 120s\n${output()}`);
}

async function stopChild(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "close"),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Next.js did not stop within 10s")),
        10_000,
      ),
    ),
  ]);
}

async function run() {
  let server: ChildProcess | undefined;
  let pool: Pool | undefined;
  let container: Awaited<ReturnType<PostgreSqlContainer["start"]>> | undefined;
  let primaryError: unknown;

  try {
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase(TEST_DATABASE_NAME)
      .start();
    const databaseUri = container.getConnectionUri();
    pool = new Pool({ connectionString: databaseUri });
    await applyMigrations(pool, resolve(process.cwd(), "migrations"));

    const port = await availablePort();
    const baseURL = `http://127.0.0.1:${port}`;
    const authSecret = "gym-flow-e2e-secret-12345678901234567890";
    const sessionToken = randomUUID();
    const signature = createHmac("sha256", authSecret)
      .update(sessionToken)
      .digest("base64");
    const sessionCookie = `better-auth.session_token=${sessionToken}.${signature}`;
    const environment = {
      ...process.env,
      DATABASE_URL: "",
      GYM_FLOW_E2E: "1",
      GYM_FLOW_E2E_DATABASE_URL: databaseUri,
      GYM_FLOW_E2E_SUITE_ID: randomUUID(),
      GYM_FLOW_E2E_SESSION_TOKEN: sessionToken,
      GYM_FLOW_E2E_SESSION_COOKIE: sessionCookie,
      BETTER_AUTH_SECRET: authSecret,
      PLAYWRIGHT_BASE_URL: baseURL,
    };

    server = spawn(
      process.execPath,
      [
        resolve(process.cwd(), "node_modules/next/dist/bin/next"),
        "dev",
        "--webpack",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: process.cwd(),
        env: environment,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    await seedReadinessScenario(pool, sessionToken);
    const serverOutput = captureOutput(server);
    await waitForServer(baseURL, sessionCookie, server, serverOutput);

    const playwright = spawn(
      process.execPath,
      [resolve(process.cwd(), "node_modules/@playwright/test/cli.js"), "test"],
      { cwd: process.cwd(), env: environment, stdio: "inherit" },
    );
    const [exitCode] = (await once(playwright, "close")) as [number | null];
    if (exitCode !== 0) {
      throw new Error(`Playwright exited with code ${exitCode ?? "signal"}`);
    }
  } catch (error) {
    primaryError = error;
  } finally {
    const teardownErrors: unknown[] = [];
    for (const teardown of [
      () => stopChild(server),
      () => pool?.end(),
      () => container?.stop(),
    ]) {
      try {
        await teardown();
      } catch (error) {
        teardownErrors.push(error);
      }
    }

    if (primaryError) {
      if (teardownErrors.length) {
        console.error("E2E teardown also failed:", ...teardownErrors);
      }
      throw primaryError;
    }

    if (teardownErrors.length) {
      throw new AggregateError(teardownErrors, "E2E teardown failed");
    }
  }
}

async function seedReadinessScenario(pool: Pool, sessionToken: string) {
  await pool.query("begin");
  try {
    await pool.query(
      `insert into users (id, name, email, email_normalized, email_verified)
       values ('local-user', 'Local user', 'local@gym-flow.test', 'local@gym-flow.test', true)
       on conflict (id) do update set
         email = excluded.email,
         email_normalized = excluded.email_normalized,
         email_verified = excluded.email_verified`,
    );
    const gym = await pool.query<{ id: string }>(
      "insert into gyms (name, owner_user_id) values ('Main gym', 'local-user') returning id::text",
    );
    const membership = await pool.query<{ id: string }>(
      `insert into memberships (gym_id, user_id, role, status)
       values ($1, 'local-user', 'owner', 'active') returning id::text`,
      [gym.rows[0].id],
    );
    await pool.query(
      `insert into active_gym_selections (user_id, gym_id, membership_id)
       values ('local-user', $1, $2)`,
      [gym.rows[0].id, membership.rows[0].id],
    );
    await pool.query(
      `insert into sessions (id, user_id, token, expires_at)
       values ($1, 'local-user', $1, now() + interval '1 day')`,
      [sessionToken],
    );
    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
