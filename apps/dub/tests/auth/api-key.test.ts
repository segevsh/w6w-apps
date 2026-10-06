import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const req = () => ({ url: "https://api.dub.co/links", method: "GET", headers: {} });

Deno.test("api-key: sign stamps a bearer token and touches nothing else", () => {
  const request = req();
  const out = auth.sign!({ request, credential: { apiKey: "dub_123" } }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { authorization: "Bearer dub_123" });
  assertEquals((out as typeof request).url, "https://api.dub.co/links");
});

Deno.test("api-key: declares the Bearer header and a secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});

Deno.test("api-key: test passes on a link array and asks for a single row", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "l1" }] }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/links");
  assertEquals(url.searchParams.get("pageSize"), "1");
  assertEquals(calls[0].headers.authorization, "Bearer k");
});

Deno.test("api-key: test fails a 200 that is not a link array", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("not a link array"));
});

Deno.test("api-key: test reports the vendor's own message for a bad and a missing key", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: { code: "unauthorized", message: "Unauthorized: Invalid API key." } },
  }]);
  const r1 = await auth.test!({ credential: { apiKey: "k" } }, bad.ctx);
  assertEquals([r1.ok, r1.message], [false, "Unauthorized: Invalid API key."]);
  const missing = mockCtx([{
    status: 401,
    body: { error: { code: "unauthorized", message: "Missing Authorization header." } },
  }]);
  const r2 = await auth.test!({ credential: { apiKey: "k" } }, missing.ctx);
  assertEquals(r2.message, "Missing Authorization header.");
});

Deno.test("api-key: a 403 forbidden is a recognised, restricted key — still a working credential", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { code: "forbidden", message: "This API key does not have links.read." } },
  }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
});

Deno.test("api-key: a 5xx or a non-JSON body is not read as a bad key", async () => {
  const down = mockCtx([{
    status: 500,
    body: { error: { code: "internal_server_error", message: "oops" } },
  }]);
  const r1 = await auth.test!({ credential: { apiKey: "k" } }, down.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("erroring (500)"));
  const html = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const r2 = await auth.test!({ credential: { apiKey: "k" } }, html.ctx);
  assertEquals(r2.ok, false);
  assert(r2.message!.includes("non-error body"));
});

Deno.test("api-key: test fails fast without a key and on a network error", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
  const boom = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as typeof ctx;
  const res = await auth.test!({ credential: { apiKey: "k" } }, boom);
  assertEquals(res.ok, false);
  assert(res.message!.includes("could not reach"));
});
