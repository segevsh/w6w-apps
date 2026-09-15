import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf, TABLES_API_ROOT } from "../_helpers.ts";

Deno.test("api-key: authHeaders stamps softr-api-key, lowercased key", () => {
  assertEquals(authHeaders({ apiKey: "pat_123" }), { "softr-api-key": "pat_123" });
});

Deno.test("api-key: sign injects the header and returns the request", () => {
  const request = {
    method: "GET",
    url: "https://tables-api.softr.io/api/v1/databases",
    headers: {} as Record<string, string>,
  };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "pat_123" } },
    {} as never,
  ) as typeof request;
  assertEquals(out.headers["softr-api-key"], "pat_123");
});

Deno.test("api-key: test probes GET /databases", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const result = await apiKey.test({ credential: { apiKey: "pat_123" } }, ctx);

  assertEquals(pathOf(calls[0].url), `/api/v1${PROBE_PATH}`);
  assert(calls[0].url.startsWith(TABLES_API_ROOT));
  assertEquals(calls[0].headers["softr-api-key"], "pat_123");
  assertEquals(result, { ok: true });
});

Deno.test("api-key: a missing credential fails without a call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a rejected token surfaces the vendor's own error body, not a bare status", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { message: "Invalid or expired token", errorCode: "UNAUTHORIZED" } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "bad" } }, ctx);

  assertEquals(result.ok, false);
  assert(result.message?.includes("Invalid or expired token"));
  assert(result.message?.includes("UNAUTHORIZED"));
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.type, "apiKey");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
