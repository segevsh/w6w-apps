import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { PROBE_FN } from "../../auth/api-key.ts";
import { envelope, errorEnvelope, mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const auth = apiKey as any;

Deno.test("auth: header API key, X-DS-API-KEY, secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-DS-API-KEY" });
  const field = apiKey.fields?.[0];
  assertEquals(field?.key, "apiKey");
  assertEquals(field?.type, "secret");
});

Deno.test("auth.sign: stamps the header and nothing else", () => {
  const req = { url: "https://www.digistore24.com/api/call/ping", method: "GET", headers: {} };
  const out = auth.sign({ request: req, credential: { apiKey: "123-abc" } });
  assertEquals(out.headers, { "x-ds-api-key": "123-abc" });
  assertEquals(out.url, req.url);
});

Deno.test("auth.test: success envelope is ok and probes getUserInfo with the header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ user_id: 1, user_name: "vendor1" }) }]);
  const res = await auth.test({ credential: { apiKey: "123-abc" } }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(PROBE_FN, "getUserInfo");
  assertEquals(calls[0].url, "https://www.digistore24.com/api/call/getUserInfo");
  assertEquals(calls[0].headers["x-ds-api-key"], "123-abc");
});

/** Measured live: a rejected key answers HTTP 200 with result:"error". */
Deno.test("auth.test: classifies a rejected key from the body, not the HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  const res = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message.includes("The API key is invalid."));
  assert(res.message.includes("code 2"));
});

Deno.test("auth.test: markup is a failure, an empty credential is refused before any fetch", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const res = await auth.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message.includes("502"));

  const none = mockCtx([]);
  const empty = await auth.test({ credential: { apiKey: "  " } }, none.ctx);
  assertEquals(empty, { ok: false, message: "credential missing apiKey" });
  assertEquals(none.calls.length, 0);
});

Deno.test("auth.afterConnect: publishes login name and id only, never the key", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ user_id: 77, user_name: "vendor1", granted_roles: "user,vendor" }),
  }]);
  const out = await auth.afterConnect({ credential: { apiKey: "123-abc" } }, ctx);
  assertEquals(out, { user_name: "vendor1", user_id: "77" });
  assert(!JSON.stringify(out).includes("123-abc"));
});

Deno.test("auth.afterConnect: a failed fetch yields an empty label, not an error", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("boom")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals(await auth.afterConnect({ credential: { apiKey: "k" } }, ctx), {});
  const { ctx: c2 } = mockCtx([{ body: errorEnvelope("The API key is invalid.", 2) }]);
  assertEquals(await auth.afterConnect({ credential: { apiKey: "k" } }, c2), {});
});
