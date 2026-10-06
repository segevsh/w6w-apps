import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-KEY" };

Deno.test("api-key: sign uses `api` on the single host and `key` on the bulk host", async () => {
  const { ctx } = mockCtx();
  const single = await apiKey.sign!({
    request: {
      url: "https://api.millionverifier.com/api/v3/?email=a%40b.com",
      method: "GET",
      headers: {},
    },
    credential: { apiKey: " SECRET-KEY " },
  }, ctx);
  const u1 = new URL(single.url);
  assertEquals(u1.searchParams.get("api"), "SECRET-KEY");
  assertEquals(u1.searchParams.get("email"), "a@b.com");
  assertEquals(u1.searchParams.has("key"), false);
  const bulk = await apiKey.sign!({
    request: {
      url: "https://bulkapi.millionverifier.com/bulkapi/v2/filelist?limit=5",
      method: "GET",
      headers: {},
    },
    credential: cred,
  }, ctx);
  const u2 = new URL(bulk.url);
  assertEquals(u2.searchParams.get("key"), "SECRET-KEY");
  assertEquals(u2.searchParams.get("limit"), "5");
  assertEquals(u2.searchParams.has("api"), false);
  assertEquals(bulk.headers.authorization, undefined);
});

Deno.test("api-key: test passes on a numeric credits figure via the free credits read", async () => {
  const { ctx, calls } = mockCtx([{ body: { credits: 5, bulk_credits: 5, plan: 1 } }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(
    calls[0].url,
    "https://api.millionverifier.com/api/v3/credits?api=SECRET-KEY",
  );
});

Deno.test("api-key: a HTTP 200 apikey_not_found body is a rejection that never echoes the key", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { result: "error", error: "apikey_not_found" } }]);
  const res = await apiKey.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"));
  assert(!res.message?.includes("SECRET-KEY"));
});

Deno.test("api-key: other errors, a body without credits and a missing key get distinct messages", async () => {
  const other = mockCtx([{ body: { error: "rate limited" } }]);
  assert((await apiKey.test!({ credential: cred }, other.ctx)).message?.includes("rate limited"));
  const html = mockCtx([{ status: 503, headers: { "content-type": "text/html" }, body: "oops" }]);
  assert((await apiKey.test!({ credential: cred }, html.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: { apiKey: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
