import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const req = () => ({ url: "https://actionnetwork.org/api/v2/people", method: "GET", headers: {} });
const REJECTED = { error: "API Key invalid or not present sk_live_SECRET" };

Deno.test("api-key: sign stamps OSDI-API-Token and touches nothing else", () => {
  const request = req();
  const out = auth.sign!({ request, credential: { apiKey: "an_123" } }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { "osdi-api-token": "an_123" });
  assertEquals((out as typeof request).url, "https://actionnetwork.org/api/v2/people");
});

Deno.test("api-key: declares the header and a required secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "OSDI-API-Token" });
  assertEquals(auth.fields![0].key, "apiKey");
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});

Deno.test("api-key: test passes on a people collection and asks for one row", async () => {
  const { ctx, calls } = mockCtx([{
    body: { per_page: 1, page: 1, _links: { self: { href: "x" } } },
  }]);
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/people");
  assertEquals(url.searchParams.get("per_page"), "1");
  assertEquals(calls[0].headers["osdi-api-token"], "k");
});

Deno.test("api-key: test fails a 200 that is not a people collection", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("not a people collection"));
});

Deno.test("api-key: a rejected key gives a fixed message that never echoes the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: REJECTED }]);
  const r = await auth.test!({ credential: { apiKey: "sk_live_SECRET" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected the API key"));
  assert(!r.message!.includes("sk_live_SECRET"));
});

Deno.test("api-key: a rejected key is read from the body even on a 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: REJECTED }]);
  const r = await auth.test!({ credential: { apiKey: "sk_live_SECRET" } }, ctx);
  assertEquals(r.ok, false);
});

Deno.test("api-key: a 5xx is reported as the vendor erroring", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("erroring (502)"));
});

Deno.test("api-key: another 4xx surfaces its status and a redacted error", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden for this key" } }]);
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("403: forbidden for this key"));
});

Deno.test("api-key: a network failure is a failed test, not a throw", async () => {
  const ctx = { fetch: () => Promise.reject(new Error("tls")), log: () => {} } as never;
  const r = await auth.test!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("could not reach"));
});

Deno.test("api-key: a missing credential fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  const r = await auth.test!({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});
