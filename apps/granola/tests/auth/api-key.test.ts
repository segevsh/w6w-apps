import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "grn_unitTestFixtureNotARealKey";

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://public-api.granola.ai/v1/notes",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://public-api.granola.ai/v1/notes");
});

Deno.test("api-key: type is bearer with one secret field", () => {
  assertEquals(apiKey.type, "bearer");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: the probe is /folders?page_size=1 (no user data, no echoed credential)", async () => {
  assertEquals(PROBE_PATH, "/folders");
  const { ctx, calls } = mockCtx([{ body: { folders: [], hasMore: false, cursor: null } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/folders");
  assertEquals(queryOf(calls[0].url), { page_size: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: no key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await apiKey.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: INVALID_API_KEY is classified from the body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("INVALID_API_KEY", "Invalid API key format"),
  }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("INVALID_API_KEY"));
});

Deno.test("api-key: MISSING_API_KEY says the credential did not reach the request", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("MISSING_API_KEY", "Missing") }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("no API key"));
});

Deno.test("api-key: 403 and other statuses are failures with their own message", async () => {
  const a = mockCtx([{ status: 403, body: { code: "FORBIDDEN", message: "nope" } }]);
  const r1 = await apiKey.test({ credential: { apiKey: KEY } }, a.ctx);
  assert(!r1.ok && r1.message!.includes("403") && r1.message!.includes("nope"));
  const b = mockCtx([{ status: 502, body: "bad gateway" }]);
  const r2 = await apiKey.test({ credential: { apiKey: KEY } }, b.ctx);
  assert(!r2.ok && r2.message!.includes("502"));
});
