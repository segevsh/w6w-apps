import { assert, assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { token: "SECRET-TOKEN", region: "lon" };

Deno.test("api-token: sign adds ?token= to the URL and keeps the rest", async () => {
  const { ctx } = mockCtx();
  const out = await apiToken.sign!({
    request: {
      url: "https://production-lon.browserless.io/pdf?timeout=5",
      method: "POST",
      headers: {},
    },
    credential: { token: " SECRET-TOKEN " },
  }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("token"), "SECRET-TOKEN");
  assertEquals(url.searchParams.get("timeout"), "5");
  assertEquals(out.headers.authorization, undefined);
});

Deno.test("api-token: test passes on 2xx without reading or echoing the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { secretUsage: 1 } }]);
  const res = await apiToken.test!({ credential: cred }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://api.browserless.io/v1/account/usage?token=SECRET-TOKEN");
  assertEquals(calls[0].method, "GET");
});

Deno.test("api-token: a plain-text 'Invalid API key' is a rejection that never echoes the token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "Invalid API key. Please check it. (requestId: 1)",
  }]);
  const res = await apiToken.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"));
  assert(!res.message?.includes("SECRET-TOKEN"));
});

Deno.test("api-token: the account host's JSON error and an HTML edge 401 are both rejections", async () => {
  const json = mockCtx([{ status: 401, body: { error: "Invalid API token" } }]);
  assertEquals((await apiToken.test!({ credential: cred }, json.ctx)).ok, false);
  const html = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html" },
    body: "<html><title>401 Authorization Required</title></html>",
  }]);
  const res = await apiToken.test!({ credential: cred }, html.ctx);
  assert(res.message?.includes("401 Authorization Required"));
});

Deno.test("api-token: 429, 5xx and a missing token get distinct messages", async () => {
  const busy = mockCtx([{ status: 429, body: "Too many" }]);
  assert((await apiToken.test!({ credential: cred }, busy.ctx)).message?.includes("rate-limited"));
  const down = mockCtx([{ status: 503, body: "oops" }]);
  const d = await apiToken.test!({ credential: cred }, down.ctx);
  assert(d.message?.includes("HTTP 503"));
  const none = mockCtx();
  const n = await apiToken.test!({ credential: { token: " " } }, none.ctx);
  assertEquals(n.ok, false);
  assertEquals(none.calls.length, 0);
});

Deno.test("api-token: afterConnect stores a valid region and falls back to sfo", async () => {
  const { ctx } = mockCtx();
  assertEquals(await apiToken.afterConnect!({ credential: cred }, ctx), { region: "lon" });
  assertEquals(await apiToken.afterConnect!({ credential: { token: "t", region: "mars" } }, ctx), {
    region: "sfo",
  });
});
