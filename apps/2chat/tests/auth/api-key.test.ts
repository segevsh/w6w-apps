import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import apiKey from "../../auth/api-key.ts";

const INFO = {
  success: true,
  account: { name: "Acme (ACC1)", uuid: "ACC1", on_trial: false, blocked: false },
  limits: { requests_per_minute: 80 },
  usage: { api_request_count: 1, max_api_request_count: 10 },
};

Deno.test("api-key: sign puts the key in X-User-API-Key, bare, and leaves the URL alone", () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: "https://api.p.2chat.io/open/info",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "k-123" } } as never,
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["x-user-api-key"], "k-123");
  assertEquals(signed.headers["authorization"], undefined);
  assert(!signed.url.includes("k-123"));
});

Deno.test("api-key: declares the header scheme the guide documents", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-User-API-Key" });
});

Deno.test("api-key: test probes GET /info with the key header", async () => {
  const { ctx, calls } = mockCtx([{ body: INFO }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/info");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["x-user-api-key"], "k");
});

Deno.test("api-key: test fails fast without a key and never touches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test reports the gateway's 401 detail", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  const result = await apiKey.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Invalid API Key"), result.message);
});

Deno.test("api-key: test reports the documented error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: { error: true, error_message: "Please upgrade" },
  }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Please upgrade"), result.message);
});

Deno.test("api-key: test refuses a 200 that is not the /info shape", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("unexpected body"), result.message);
});

Deno.test("api-key: test fails a blocked account even on a 200", async () => {
  const { ctx } = mockCtx([{ body: { ...INFO, account: { ...INFO.account, blocked: true } } }]);
  const result = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("blocked"), result.message);
});

Deno.test("api-key: afterConnect labels the connection without carrying the key", async () => {
  const { ctx } = mockCtx([{ body: INFO }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: "k-secret" } } as never, ctx);
  assertEquals(display, { accountName: "Acme (ACC1)", accountUuid: "ACC1", onTrial: false });
  assert(!JSON.stringify(display).includes("k-secret"));
});

Deno.test("api-key: afterConnect returns nothing on a failed lookup", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid API Key" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: "k" } } as never, ctx), {});
});
