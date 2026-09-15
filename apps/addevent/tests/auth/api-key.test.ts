import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-key: sign() stamps the bearer header and never touches the network", () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "sk_live_abc" } } as never,
    {} as never,
  );
  assertEquals((out as typeof request).headers.authorization, "Bearer sk_live_abc");
});

Deno.test("authHeaders: builds the exact documented wire format", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Bearer abc" });
});

Deno.test("api-key.test: probes GET /calendars with page_size=1 and succeeds on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { calendars: [] } }]);
  const out = await apiKey.test({ credential: { apiKey: "sk_live_abc" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/calendars");
  assertEquals(queryOf(calls[0].url).page_size, "1");
  assertEquals(calls[0].headers.authorization, "Bearer sk_live_abc");
});

Deno.test("api-key.test: an empty credential fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Live-confirmed shape: 401 with `{"error_id":"...","error_message":"","error_code":900}`.
 * The message must say "invalid credential", not echo the blank error_message back.
 */
Deno.test("api-key.test: a 401 reports an invalid/missing key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("", 900) }]);
  const out = await apiKey.test({ credential: { apiKey: "wrong" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true, out.message);
  assertEquals(out.message?.includes("rejected the API key"), true, out.message);
});

/**
 * A 403 is a DIFFERENT failure from a 401 — the key is fine, the plan/quota isn't.
 * This must not be reported as "invalid credential".
 */
Deno.test("api-key.test: a 403 reports the plan/permission reason, distinct from a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("", 910) }]);
  const out = await apiKey.test({ credential: { apiKey: "sk_live_abc" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("permission"), true, out.message);
  assertEquals(out.message?.toLowerCase().includes("invalid"), false, out.message);
});

Deno.test("api-key.test: an unexpected status still reports something actionable", async () => {
  const { ctx } = mockCtx([{ status: 500, body: undefined }]);
  const out = await apiKey.test({ credential: { apiKey: "sk_live_abc" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("500"), true, out.message);
});

Deno.test("api-key: the credential field is declared secret", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "bearer");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
