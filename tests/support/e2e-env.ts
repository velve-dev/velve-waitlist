export const e2eHealthToken = "test-health-token-0123456789abcdef0123";
export const e2eWebhookSecret = "test-webhook-secret-0123456789abcdef01";
export const appPort = Number(process.env.E2E_APP_PORT ?? "8674");
export const mockPort = Number(process.env.E2E_MOCK_PORT ?? "8675");
export const brevoMockUrl = `http://127.0.0.1:${mockPort}`;
