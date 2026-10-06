import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-KEY" };
const account = { email: "a@b.test", remaining_total_credits: 10 };

Deno.test("api-key: sign sets the api_key query param (trimmed), keeping the rest of the url", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: {
      url: "https://api.webscraping.ai/html?url=https%3A%2F%2Fe.test",
      method: "GET",
      headers: {},
    },
    credential: { apiKey: "  SECRET-KEY " },
  }, ctx);
  const u = new URL(out.url);
  assertEquals(u.searchParams.get("api_key"), "SECRET-KEY");
  assertEquals(u.searchParams.get("url"), "https://e.test");
  assertEquals(out.headers["x-api-key"], undefined);
});

Deno.test("api-key: sign overwrites a pre-existing api_key rather than duplicating it", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: { url: "https://api.webscraping.ai/account?api_key=old", method: "GET", headers: {} },
    credential: cred,
  }, ctx);
  assertEquals(new URL(out.url).searchParams.getAll("api_key"), ["SECRET-KEY"]);
});

Deno.test("api-key: test passes only on the credit counters, via a signed GET /account", async () => {
  const { ctx, calls } = mockCtx([{ body: account }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/account");
  assertEquals(u.searchParams.get("api_key"), "SECRET-KEY");
  const hollow = mockCtx([{ body: { hello: "world" } }]);
  const res = await apiKey.test!({ credential: cred }, hollow.ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("without credit counters"));
});

Deno.test("api-key: a 403 Wrong API key is a rejection; the key is never repeated in the message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Wrong API key." } }]);
  const res = await apiKey.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected the API key"));
  assertEquals(res.message?.includes("SECRET-KEY"), false);
  // The vendor's own message decides, not just the status.
  const byBody = mockCtx([{ status: 400, body: { message: "Wrong API key." } }]);
  assertEquals((await apiKey.test!({ credential: cred }, byBody.ctx)).ok, false);
});

Deno.test("api-key: 402 means the key was accepted; 429 and 5xx are not valid; a missing key skips the call", async () => {
  const quota = mockCtx([{ status: 402, body: { message: "quota exceeded" } }]);
  assertEquals((await apiKey.test!({ credential: cred }, quota.ctx)).ok, true);
  const busy = mockCtx([{ status: 429, body: { message: "Too many" } }]);
  assert((await apiKey.test!({ credential: cred }, busy.ctx)).message?.includes("429"));
  const down = mockCtx([{
    status: 502,
    headers: { "content-type": "text/html" },
    body: "<title>Bad Gateway</title>",
  }]);
  const res = await apiKey.test!({ credential: cred }, down.ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("Bad Gateway"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: {} }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
