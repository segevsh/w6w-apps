import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "./_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (hook: any, credential: unknown, ctx: unknown) => hook({ credential }, ctx);

Deno.test("auth: declares an apiKey method on the sc-api header with a secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "sc-api" });
  assertEquals(apiKey.fields?.[0].key, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
});

Deno.test("auth: sign stamps sc-api and leaves the URL alone", () => {
  // deno-lint-ignore no-explicit-any
  const sign = apiKey.sign as any;
  const request = { url: "https://api.samcart.com/v1/orders", method: "GET", headers: {} };
  const out = sign({ request, credential: { apiKey: "k_123" } });
  assertEquals(out.headers["sc-api"], "k_123");
  assertEquals(out.url, "https://api.samcart.com/v1/orders");
});

Deno.test("auth: authHeaders tolerates a missing key", () => {
  assertEquals(authHeaders({}), { "sc-api": "" });
});

Deno.test("auth: test passes on a data array and probes the product list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: {} } }]);
  assertEquals(await run(apiKey.test, { apiKey: "k" }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/products");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["sc-api"], "k");
});

Deno.test("auth: test rejects from the body message and does not echo the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { message: "Invalid authentication credentials" },
  }]);
  const out = await run(apiKey.test, { apiKey: "secret-key-value" }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message.includes("Invalid authentication credentials"), true);
  assertEquals(out.message.includes("secret-key-value"), false);
});

Deno.test("auth: a 200 without a data array is still a rejection", async () => {
  const { ctx } = mockCtx([{ body: { message: "No API key found in request" } }]);
  const out = await run(apiKey.test, { apiKey: "k" }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message.includes("No API key found"), true);
});

Deno.test("auth: a 403 points at the plan", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "API access is not available" } }]);
  const out = await run(apiKey.test, { apiKey: "k" }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message.includes("plan"), true);
});

Deno.test("auth: a missing key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await run(apiKey.test, { apiKey: "  " }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
