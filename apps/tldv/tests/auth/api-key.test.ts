import { assert, assertEquals } from "@std/assert";
import { AUTH_REQUIRED_401, mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_BASE, API_PREFIX } from "../../lib/client.ts";

const PROBE_URL = `${API_BASE}${API_PREFIX}/meetings`;

Deno.test("api-key: sign stamps x-api-key and returns the request", () => {
  const request = { url: PROBE_URL, method: "GET", headers: {} as Record<string, string> };
  // deno-lint-ignore no-explicit-any
  const out = auth.sign!({ request, credential: { apiKey: "tldv_secret" } } as any, null as any);
  assertEquals((out as typeof request).headers["x-api-key"], "tldv_secret");
});

Deno.test("api-key: manifest declares an apiKey header with no prefix", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "x-api-key" });
});

Deno.test("api-key: test accepts a live key and calls the un-paginated probe with no query", async () => {
  const { ctx, calls } = mockCtx([{
    body: { results: [], page: 1, pages: 0, total: 0, pageSize: 50 },
  }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["x-api-key"], "k");
});

Deno.test("api-key: test rejects a bad key using the vendor's own error body", async () => {
  const { ctx } = mockCtx([AUTH_REQUIRED_401]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "bad" } } as any, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("AuthorizationRequiredError"));
});

Deno.test("api-key: test does not call the API when no credential was supplied", async () => {
  const { ctx, calls } = mockCtx([]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: {} } as any, ctx);
  assertEquals(res, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test refuses a 200 whose body carries no results array", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  // deno-lint-ignore no-explicit-any
  const res = await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(res.ok, false);
});

Deno.test("api-key: the probe sends no query string, sidestepping the validation-before-auth trap", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  // deno-lint-ignore no-explicit-any
  await auth.test({ credential: { apiKey: "k" } } as any, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});
