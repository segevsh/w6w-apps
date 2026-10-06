import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "unitTestFixtureNotARealKey0000";
const REJECTION = {
  error_category: "CLIENT_ERROR",
  error_metadata: { error_kind: "NOT_AUTHORIZED", message: "unsupported scheme: Bearer" },
};

Deno.test("api-key: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://api.mem.ai/v2/notes",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assert(!signed.url.includes(KEY));
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

Deno.test("api-key: test passes when the probe answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [], total: 0 } }]);
  assertEquals(await apiKey.test({ credential: { apiKey: KEY } }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails with no key and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await apiKey.test({ credential: { apiKey: "  " } }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: NOT_AUTHORIZED in the body is a rejected key, and never echoes it", async () => {
  const { ctx } = mockCtx([{ status: 401, body: REJECTION }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected"));
  assert(!r.message!.includes(KEY));
});

Deno.test("api-key: a 401 without the vendor's error kind is not called a bad key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>proxy</html>" }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("HTTP 401"));
  assert(!r.message!.includes("rejected"));
});

Deno.test("api-key: other failures report the status and vendor message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error: { type: "x", message: "boom" } } }]);
  const r = await apiKey.test({ credential: { apiKey: KEY } }, ctx);
  assert(r.message!.includes("HTTP 500") && r.message!.includes("boom"));
});
