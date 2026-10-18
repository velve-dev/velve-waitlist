// Serves the standalone build against a mocked Brevo for tests.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { mockApiKey, startBrevoMock } from "../tests/support/brevo-mock.ts";
import { appPort, e2eHealthToken, e2eWebhookSecret, mockPort } from "../tests/support/e2e-env.ts";

const root = path.resolve(import.meta.dirname, "..");
const standalone = path.join(root, ".next/standalone");

cpSync(path.join(root, ".next/static"), path.join(standalone, ".next/static"), { recursive: true });
if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
}

const mock = await startBrevoMock(mockPort);
const mockUrl = `http://127.0.0.1:${mockPort}`;

const server = spawn(process.execPath, ["server.js"], {
  cwd: standalone,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(appPort),
    HOSTNAME: "127.0.0.1",
    SITE_URL: `http://127.0.0.1:${appPort}`,
    BREVO_API_URL: `${mockUrl}/v3`,
    BREVO_API_KEY: mockApiKey,
    BREVO_LIST_ID: "7",
    BREVO_SENDER_EMAIL: "updates@velve.dev",
    BREVO_SENDER_NAME: "Velve",
    BREVO_REPLY_TO: "hello@velve.dev",
    BREVO_WEBHOOK_SECRET: e2eWebhookSecret,
    TOKEN_KEY: randomBytes(32).toString("base64"),
    RATE_LIMIT_SALT_SECRET: randomBytes(32).toString("hex"),
    CONSENT_VERSION: "2026-10-18",
    HEALTH_TOKEN: e2eHealthToken,
    UMAMI_URL: `${mockUrl}/umami`,
    UMAMI_WEBSITE_ID: "e2e-website",
    DAILY_SEND_CAP: "100000",
  },
});

const stop = () => {
  server.kill("SIGTERM");
  mock.server.close();
};
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
server.on("exit", (code) => {
  mock.server.close();
  process.exit(code ?? 0);
});
