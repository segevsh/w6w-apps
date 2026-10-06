import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-KEY" };

Deno.test("api-key: sign sets the lower-case Api-Key header and leaves the URL alone", async () => {
  const { ctx } = mockCtx();
  const out = await apiKey.sign!({
    request: {
      url: "https://api.rocketreach.co/api/v2/person/lookup?id=1",
      method: "GET",
      headers: {},
    },
    credential: { apiKey: " SECRET-KEY " },
  }, ctx);
  assertEquals(out.headers["api-key"], "SECRET-KEY");
  assertEquals(out.url, "https://api.rocketreach.co/api/v2/person/lookup?id=1");
  assertEquals(apiKey.apiKey, { in: "header", name: "Api-Key" });
});

Deno.test("api-key: test passes on a 200 account body via GET /account/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 12, email: "a@b.c", credit_usage: [] } }]);
  assertEquals(await apiKey.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/account/");
  assertEquals(calls[0].headers["api-key"], "SECRET-KEY");
});

Deno.test("api-key: a 200 that is not an account is not a pass", async () => {
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>shell</html>" }]);
  assertEquals((await apiKey.test!({ credential: cred }, html.ctx)).ok, false);
  const json = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await apiKey.test!({ credential: cred }, json.ctx)).ok, false);
});

Deno.test("api-key: a 401 authentication_failed is a rejection that never echoes the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { detail: "Invalid API key", error_code: "authentication_failed" },
  }]);
  const res = await apiKey.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected") && res.message.includes("Invalid API key"));
  assert(!res.message?.includes("SECRET-KEY"));
});

Deno.test("api-key: 403, 429, 5xx and a missing key get distinct messages", async () => {
  const forbidden = mockCtx([{ status: 403, body: { detail: "no access" } }]);
  assert((await apiKey.test!({ credential: cred }, forbidden.ctx)).message?.includes("refused"));
  const busy = mockCtx([{ status: 429, body: { detail: "slow" } }]);
  assert((await apiKey.test!({ credential: cred }, busy.ctx)).message?.includes("rate-limited"));
  const down = mockCtx([{ status: 503, body: "oops" }]);
  assert((await apiKey.test!({ credential: cred }, down.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await apiKey.test!({ credential: { apiKey: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
