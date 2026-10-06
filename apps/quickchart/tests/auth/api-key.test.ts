import { assertEquals } from "@std/assert";
import apiKey, { authHeaders, probeRequest } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const signed = (credential: unknown) =>
  apiKey.sign!({
    request: { url: "https://quickchart.io/chart", method: "POST", headers: {} },
    credential,
  }, mockCtx().ctx);

Deno.test("api-key sign: adds a Bearer header when a key is set", async () => {
  const req = await signed({ apiKey: "  qc-123 " });
  assertEquals(req.headers["authorization"], "Bearer qc-123");
  assertEquals(req.url, "https://quickchart.io/chart");
});

Deno.test("api-key sign: leaves the request untouched with no key (anonymous use)", async () => {
  assertEquals((await signed({})).headers, {});
  assertEquals((await signed({ apiKey: "  " })).headers, {});
  assertEquals(authHeaders(undefined), {});
});

Deno.test("api-key test: no key is ok and makes no request", async () => {
  const { ctx, calls } = mockCtx();
  const out = await apiKey.test!({ credential: {} }, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls.length, 0);
});

Deno.test("api-key test: authenticated:true passes, and the probe carries the Bearer header", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, normalized: { authenticated: true } },
  }]);
  assertEquals((await apiKey.test!({ credential: { apiKey: "k" } }, ctx)).ok, true);
  assertEquals(calls[0].url, probeRequest().url);
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("api-key test: a 200 with authenticated:false is a rejected key (vendor treats it as anonymous)", async () => {
  const { ctx } = mockCtx([{ body: { success: true, normalized: { authenticated: false } } }]);
  const out = await apiKey.test!({ credential: { apiKey: "bogus" } }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("api-key test: 403, 429 and 5xx are not passes", async () => {
  for (const status of [403, 429, 502]) {
    const { ctx } = mockCtx([{ status, body: "x" }]);
    assertEquals((await apiKey.test!({ credential: { apiKey: "k" } }, ctx)).ok, false);
  }
});

Deno.test("api-key: the key field is optional and secret", () => {
  const f = apiKey.fields![0];
  assertEquals(f.required, false);
  assertEquals(f.type, "secret");
});
