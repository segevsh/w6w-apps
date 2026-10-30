import { test as nodeTest } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import apiKey, { PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const CRED = { apiKey: "  key-123  " };
const test = (cred: unknown, ctx: Parameters<NonNullable<typeof apiKey.test>>[1]) =>
  apiKey.test!({ credential: cred } as never, ctx);

nodeTest("auth: declares an apiKey header X-Authorization and one secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "header", name: "X-Authorization" });
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
});

nodeTest("sign: stamps the trimmed key on X-Authorization only", () => {
  const request = { url: "https://api.loopreturns.com/api/v1/x", method: "GET", headers: {} };
  const out = apiKey.sign!({ request, credential: CRED } as never, mockCtx().ctx) as typeof request;
  assertEquals(out.headers, { "x-authorization": "key-123" });
});

nodeTest("test: a returns page passes, and the request is the signed probe", async () => {
  const { ctx, calls } = mockCtx([{ body: { returns: [], nextPageUrl: null } }]);
  assertEquals(await test(CRED, ctx), { ok: true });
  assertEquals(calls[0].url, `https://api.loopreturns.com/api/v1${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-authorization"], "key-123");
});

nodeTest("test: a 200 that is not a returns page is not a valid key", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const r = await test(CRED, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("not judged a valid key"));
});

nodeTest("test: a 200 carrying an error body is not a valid key", async () => {
  const { ctx } = mockCtx([{ body: { errors: "Unauthorized." } }]);
  assertEquals((await test(CRED, ctx)).ok, false);
});

nodeTest("test: both 401 envelopes are a rejected key", async () => {
  for (
    const body of [
      { error: { code: "401", http_code: "GEN-UNAUTHORIZED", message: "Unauthorized." } },
      { errors: "Unauthorized." },
    ]
  ) {
    const { ctx } = mockCtx([{ status: 401, body }]);
    const r = await test(CRED, ctx);
    assertEquals(r.ok, false);
    assert(r.message?.includes("rejected the API key"));
  }
});

nodeTest("test: a bad key is recognised from the body even on an odd status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { errors: "Unauthorized." } }]);
  const r = await test(CRED, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected the API key"));
});

nodeTest("test: 403 names the missing Returns scope; other statuses are reported", async () => {
  const a = mockCtx([{ status: 403, body: { errors: "Forbidden." } }]);
  assert((await test(CRED, a.ctx)).message?.includes("Returns scope"));
  const b = mockCtx([{ status: 503, body: "<html>down</html>" }]);
  assert((await test(CRED, b.ctx)).message?.includes("HTTP 503"));
});

nodeTest("test: a missing key fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ apiKey: "  " }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

nodeTest("test: a failure message never echoes the credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: "Unauthorized." } }]);
  assert(!JSON.stringify(await test(CRED, ctx)).includes("key-123"));
});
