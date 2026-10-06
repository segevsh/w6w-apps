import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "k_123" };

Deno.test("api-key: sign stamps the bearer header", async () => {
  const req = {
    url: "https://enrichlayer.com/api/v2/profile",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!({ request: req, credential: cred } as never, mockCtx().ctx);
  assertEquals((out as typeof req).headers["authorization"], "Bearer k_123");
});

Deno.test("api-key: declares a secret field and a bearer header", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});

Deno.test("api-key: test accepts a numeric credit_balance and probes /credit-balance", async () => {
  const { ctx, calls } = mockCtx([{ body: { credit_balance: 500 } }]);
  assertEquals(await apiKey.test({ credential: cred } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://enrichlayer.com/api/v2/credit-balance");
});

Deno.test("api-key: test rejects a 200 without credit_balance", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const r = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
});

Deno.test("api-key: test reports the vendor description for a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: 401, description: "Invalid API key", name: "Unauthorized" },
  }]);
  assertEquals(await apiKey.test({ credential: cred } as never, ctx), {
    ok: false,
    message: "Invalid API key",
  });
});

Deno.test("api-key: test does not trust a status code with a non-error body", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    headers: { "content-type": "text/html" },
    body: "<html>",
  }]);
  const r = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(/non-error body/.test(r.message ?? ""));
});

Deno.test("api-key: test fails fast without a key and on a network error", async () => {
  assertEquals((await apiKey.test({ credential: {} } as never, mockCtx().ctx)).ok, false);
  const ctx = {
    fetch: () => Promise.reject(new Error("boom")),
    log: () => {},
  } as never;
  const r = await apiKey.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(/boom/.test(r.message ?? ""));
});
