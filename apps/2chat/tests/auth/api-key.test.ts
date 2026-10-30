import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import apiKey from "../../auth/api-key.ts";

const INFO = {
  success: true,
  account: { name: "Acme (ACC1)", uuid: "ACC1", on_trial: false, blocked: false },
  limits: { requests_per_minute: 80 },
  usage: { api_request_count: 1, max_api_request_count: 10 },
};

test("api-key: sign puts the key in X-User-API-Key, bare, and leaves the URL alone", () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://api.p.2chat.io/open/info",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "k-123" } } as never,
    ctx,
  ) as typeof request;
  assert.deepStrictEqual(signed.headers["x-user-api-key"], "k-123");
  assert.deepStrictEqual(signed.headers["authorization"], undefined);
  assert.ok(!signed.url.includes("k-123"));
});

test("api-key: declares the header scheme the guide documents", () => {
  assert.deepStrictEqual(apiKey.type, "apiKey");
  assert.deepStrictEqual(apiKey.apiKey, { in: "header", name: "X-User-API-Key" });
});

test("api-key: test probes GET /info with the key header", async () => {
  const { ctx, calls } = mockCtx([{ body: INFO }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assert.deepStrictEqual(result.ok, true);
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/info");
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].headers["x-user-api-key"], "k");
});

test("api-key: test fails fast without a key and never touches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} } as never, ctx);
  assert.deepStrictEqual(result.ok, false);
  assert.deepStrictEqual(calls.length, 0);
});

test("api-key: test reports the gateway's 401 detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assert.deepStrictEqual(result.ok, false);
  assert.ok(result.message?.includes("Invalid API Key"), result.message);
});

test("api-key: test reports the documented error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { error: true, error_message: "Please upgrade" },
  }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assert.deepStrictEqual(result.ok, false);
  assert.ok(result.message?.includes("Please upgrade"), result.message);
});

test("api-key: test refuses a 200 that is not the /info shape", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assert.deepStrictEqual(result.ok, false);
  assert.ok(result.message?.includes("unexpected body"), result.message);
});

test("api-key: test fails a blocked account even on a 200", async () => {
  const { ctx } = mockCtx([{ body: { ...INFO, account: { ...INFO.account, blocked: true } } }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assert.deepStrictEqual(result.ok, false);
  assert.ok(result.message?.includes("blocked"), result.message);
});

test("api-key: afterConnect labels the connection without carrying the key", async () => {
  const { ctx } = mockCtx([{ body: INFO }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: "k-secret" } } as never, ctx);
  assert.deepStrictEqual(display, { accountName: "Acme (ACC1)", accountUuid: "ACC1", onTrial: false });
  assert.ok(!JSON.stringify(display).includes("k-secret"));
});

test("api-key: afterConnect returns nothing on a failed lookup", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  assert.deepStrictEqual(await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx), {});
});
