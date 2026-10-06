import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { isAuthFailure, PROBE_EMAIL, PROBE_PATH, tokenFor } from "../../auth/api-key.ts";
import { errBody, mockCtx } from "../_helpers.ts";

const cred = { apiKey: "eyJ.abc.def", writeKey: "wk-123" };

// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (apiKey.test as any)({ credential: c }, ctx);
const sign = (url: string, credential: unknown) =>
  (apiKey.sign!({
    request: { url, method: "GET", headers: {} },
    credential,
  } as never, mockCtx().ctx) as { headers: Record<string, string> }).headers;

Deno.test("auth: one apiKey method on X-Encharge-Token with a secret API key and optional write key", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-Encharge-Token" });
  assertEquals(apiKey.fields?.map((f) => [f.key, f.type, !!f.required]), [
    ["apiKey", "secret", true],
    ["writeKey", "secret", false],
  ]);
  assert(PROBE_PATH.includes(encodeURIComponent(PROBE_EMAIL)));
});

Deno.test("auth.sign: the API key goes to the REST host and the write key only to the ingest host", () => {
  assertEquals(sign("https://api.encharge.io/v1/people", cred), {
    "x-encharge-token": "eyJ.abc.def",
  });
  assertEquals(sign("https://ingest.encharge.io/v1/", cred), { "x-encharge-token": "wk-123" });
  // No write key: the ingest request is stamped empty, never with the API key.
  assertEquals(sign("https://ingest.encharge.io/v1/", { apiKey: "k" }), { "x-encharge-token": "" });
  assertEquals(sign("not a url", cred), { "x-encharge-token": "eyJ.abc.def" });
  assertEquals(tokenFor({ apiKey: "  k  " }, "api.encharge.io"), "k");
});

Deno.test("auth.test: a users list passes; the key goes in the header, never the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].method, "GET");
  assert(calls[0].url.startsWith("https://api.encharge.io/v1/people?people%5B0%5D%5Bemail%5D="));
  assertEquals(calls[0].headers["x-encharge-token"], "eyJ.abc.def");
  assertEquals(calls[0].url.includes(cred.apiKey), false);
});

Deno.test("auth.test: a missing key fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiKey: "  " }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.test: the JWT-shape rejection (10082) and the not-logged-in 401 are rejections quoting the vendor", async () => {
  const jwt = mockCtx([{
    status: 401,
    body: errBody("Token without payload (should be JWT token).", 10082),
  }]);
  const r = await test(cred, jwt.ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("Token without payload") && /401/.test(r.message), r.message);
  const nolog = mockCtx([{
    status: 401,
    body: errBody("User not logged in: Unauthorized request: no authentication given"),
  }]);
  assertEquals((await test(cred, nolog.ctx)).ok, false);
  // A rejection recognised from the body alone, whatever the status.
  const odd = mockCtx([{ status: 400, body: errBody("Token without payload", 10082) }]);
  const o = await test(cred, odd.ctx);
  assertEquals(o.ok, false);
  assert(/refused/.test(o.message), o.message);
});

Deno.test("auth.test: a non-auth 404 envelope means the key got past authentication", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errBody("Person not found") }]);
  assertEquals(await test(cred, ctx), { ok: true });
});

Deno.test("auth.test: an HTML shell, an unrecognised 200 and a 5xx are not judged valid", async () => {
  const html = mockCtx([{ status: 404, body: "<html>Cannot GET</html>", headers: {} }]);
  assertEquals((await test(cred, html.ctx)).ok, false);
  const odd = mockCtx([{ body: { hello: "world" } }]);
  const r = await test(cred, odd.ctx);
  assertEquals(r.ok, false);
  assert(/not judged/.test(r.message), r.message);
  const five = mockCtx([{ status: 503, body: errBody("unavailable") }]);
  const f = await test(cred, five.ctx);
  assertEquals(f.ok, false);
  assert(/not judged/.test(f.message) && !/refused/.test(f.message), f.message);
});

Deno.test("auth.isAuthFailure: 401/403, code 10082 and auth wording are failures; a plain 404 is not", () => {
  assertEquals(isAuthFailure(401, null), true);
  assertEquals(isAuthFailure(403, null), true);
  assertEquals(isAuthFailure(400, errBody("x", 10082)), true);
  assertEquals(isAuthFailure(400, errBody("Invalid API key")), true);
  assertEquals(isAuthFailure(404, errBody("Person not found")), false);
});
