import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const INFO = { items: [{ total_questions: 24000000 }], has_more: false, quota_max: 10000 };
const BAD_KEY = {
  error_id: 400,
  error_name: "bad_parameter",
  error_message: "`key` doesn't match a known application",
};

Deno.test("sign: sets the key query parameter and keeps the rest", async () => {
  const req = await apiKey.sign!({
    request: {
      url: "https://api.stackexchange.com/2.3/info?site=stackoverflow",
      method: "GET",
      headers: {},
    },
    credential: { apiKey: "K(( )" },
  } as never, mockCtx().ctx);
  const url = new URL(req.url);
  assertEquals(url.searchParams.get("key"), "K(( )");
  assertEquals(url.searchParams.get("site"), "stackoverflow");
});

Deno.test("test: a 200 wrapper with site statistics passes, and the key is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: INFO }]);
  assertEquals(await apiKey.test!({ credential: { apiKey: "abc(" } } as never, ctx), { ok: true });
  assertEquals(new URL(calls[0].url).searchParams.get("key"), "abc(");
});

Deno.test("test: a rejected key is read from the body, not the status", async () => {
  const { ctx } = mockCtx([{ status: 400, body: BAD_KEY }]);
  const r = await apiKey.test!({ credential: { apiKey: "nope" } } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("bad_parameter"));
  assert(r.message?.includes("stackapps.com"));
});

Deno.test("test: a 400 not about the key is reported without blaming the key", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error_id: 400, error_name: "bad_parameter", error_message: "site" },
  }]);
  const r = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(r.ok, false);
  assert(!r.message?.includes("stackapps.com"));
});

Deno.test("test: HTML 200, empty body and missing key all fail", async () => {
  const html = await apiKey.test!(
    { credential: { apiKey: "k" } } as never,
    mockCtx([{ body: "<html></html>", headers: { "content-type": "text/html" } }]).ctx,
  );
  assertEquals(html.ok, false);
  const empty = await apiKey.test!(
    { credential: { apiKey: "k" } } as never,
    mockCtx([{ body: { items: [] } }]).ctx,
  );
  assertEquals(empty.ok, false);
  const none = await apiKey.test!({ credential: {} } as never, mockCtx().ctx);
  assertEquals(none.ok, false);
});

Deno.test("test: a network failure is reported", async () => {
  const ctx = mockCtx().ctx;
  ctx.fetch = (() => Promise.reject(new Error("boom"))) as unknown as typeof fetch;
  const r = await apiKey.test!({ credential: { apiKey: "k" } } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("boom"));
});
