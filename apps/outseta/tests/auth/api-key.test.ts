import { assert, assertEquals } from "@std/assert";
import auth, { authorizationValue } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { subdomain: "acme", apiKey: "key-1", apiSecret: "sec-1" };

Deno.test("auth: the wire value is `Outseta <key>:<secret>`", () => {
  assertEquals(authorizationValue("k", "s"), "Outseta k:s");
});

Deno.test("auth: sign sets the Authorization header and nothing else", async () => {
  const req = {
    url: "https://acme.outseta.com/api/v1/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request: req, credential: cred } as never, {} as never);
  assertEquals((out as typeof req).headers["authorization"], "Outseta key-1:sec-1");
});

Deno.test("auth: both halves of the pair are secret fields; the subdomain is not", () => {
  const byKey = Object.fromEntries((auth.fields ?? []).map((f) => [f.key, f]));
  assertEquals(byKey.apiSecret.type, "secret");
  assertEquals(byKey.apiKey.type, "secret");
  assertEquals(byKey.subdomain.type, "string");
  assertEquals(byKey.subdomain.required, true);
  assertEquals(byKey.apiKey.required, true);
});

const LIST = { metadata: { limit: 1, offset: 0, total: 0 }, items: [] };

Deno.test("test: a list envelope is ok, and the probe is signed and fields-limited", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: LIST }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.host, "acme.outseta.com");
  assertEquals(url.pathname, "/api/v1/billing/planfamilies");
  assertEquals(url.searchParams.get("fields"), "Uid,Name");
  assertEquals(calls[0].headers["authorization"], "Outseta key-1:sec-1");
});

Deno.test("test: a 200 that is not a list is not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
});

Deno.test("test: a rejected pair (403, empty body — the docs say 401) is not ok", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status }]);
    const res = await auth.test!({ credential: cred } as never, ctx);
    assertEquals(res.ok, false);
    assert(res.message?.includes("rejected"));
  }
});

Deno.test("test: an unknown subdomain (404, empty body) names the host", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("acme.outseta.com"));
});

Deno.test("test: an HTML edge page is reported as not the API", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: "<!DOCTYPE html><html></html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("HTML"));
});

Deno.test("test: missing fields and a malformed subdomain fail without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test!({ credential: { subdomain: "acme" } } as never, ctx)).ok, false);
  const bad = await auth.test!({ credential: { ...cred, subdomain: "a.b/c d" } } as never, ctx);
  assertEquals(bad.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: an error message never contains the secret", async () => {
  const { ctx } = mockCtx([{ status: 403 }]);
  const res = await auth.test!({ credential: cred } as never, ctx);
  assert(!JSON.stringify(res).includes("sec-1"));
});

Deno.test("afterConnect: publishes the normalised subdomain only", async () => {
  const out = await auth.afterConnect!(
    { credential: { ...cred, subdomain: "https://Acme.outseta.com/" } } as never,
    {} as never,
  );
  assertEquals(out, { subdomain: "acme" });
});
