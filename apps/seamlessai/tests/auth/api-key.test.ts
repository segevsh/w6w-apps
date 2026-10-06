import { assertEquals } from "@std/assert";
import apiKey, { PROBE_URL } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const credential = { apiKey: "sk_live_secret" };

Deno.test("api-key.sign: stamps the Token header with the bare key (no Bearer)", async () => {
  const request = {
    url: "https://api.seamless.ai/api/client/v2/credits",
    method: "GET",
    headers: {},
  };
  // deno-lint-ignore no-explicit-any
  const signed = await (apiKey.sign as any)({ request, credential });
  assertEquals(signed.headers["token"], "sk_live_secret");
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-key.test: probes the credit balance endpoint, never one that spends credits", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  const result = await apiKey.test!({ credential } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(PROBE_URL, "https://api.seamless.ai/api/client/v2/credits");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["token"], "sk_live_secret");
});

Deno.test("api-key.test: a 401 {msg} body is a rejected key, and the message does not echo the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { msg: "Invalid token" } }]);
  const result = await apiKey.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Invalid token"), true);
  assertEquals(result.message?.includes("sk_live_secret"), false);
});

Deno.test("api-key.test: a 200 without the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>proxy</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await apiKey.test!({ credential } as never, ctx)).ok, false);
  const { ctx: ctx2 } = mockCtx([{ body: { success: true } }]);
  assertEquals((await apiKey.test!({ credential } as never, ctx2)).ok, false);
});

Deno.test("api-key.test: 429 means a recognised key under throttle, 422 a refused one", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { code: "rateLimitExceeded", message: "slow" } }]);
  assertEquals((await apiKey.test!({ credential } as never, ctx)).ok, true);
  const { ctx: ctx2 } = mockCtx([{
    status: 422,
    body: { msg: "no licence", code: "missingLicense" },
  }]);
  const refused = await apiKey.test!({ credential } as never, ctx2);
  assertEquals(refused.ok, false);
  assertEquals(refused.message?.includes("missingLicense"), true);
});

Deno.test("api-key.test: a blank key fails locally without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
