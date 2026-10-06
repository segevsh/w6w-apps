import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/personal-access-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "SECRET-TOKEN" };
const me = { id: "5d9caaecb4a3fa9bc9718686", email: "a@b.test", username: "ab" };

Deno.test("pat: sign sets a trimmed Bearer Authorization header and leaves the url alone", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({
    request: { url: "https://api.zeplin.dev/v1/projects?limit=5", method: "GET", headers: {} },
    credential: { apiKey: "  SECRET-TOKEN " },
  }, ctx);
  assertEquals(out.headers["authorization"], "Bearer SECRET-TOKEN");
  assertEquals(out.url, "https://api.zeplin.dev/v1/projects?limit=5");
  assertEquals(auth.type, "bearer");
});

Deno.test("pat: test passes only on a user id, via a signed GET /v1/users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: me }]);
  assertEquals(await auth.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.zeplin.dev/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer SECRET-TOKEN");
  const hollow = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: cred }, hollow.ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("without a user id"));
});

Deno.test("pat: invalid_token is a rejection decided by the body; the token is never echoed", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "invalid_token" } }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected the token"));
  assertEquals(res.message?.includes("SECRET-TOKEN"), false);
  const byBody = mockCtx([{ status: 400, body: { message: "invalid_token" } }]);
  assertEquals((await auth.test!({ credential: cred }, byBody.ctx)).ok, false);
});

Deno.test("pat: 429 means accepted; 5xx is not valid; a missing token skips the call", async () => {
  const busy = mockCtx([{ status: 429, body: { message: "Rate limit exceeded" } }]);
  assertEquals((await auth.test!({ credential: cred }, busy.ctx)).ok, true);
  const down = mockCtx([{
    status: 502,
    headers: { "content-type": "text/html" },
    body: "<title>Bad Gateway</title>",
  }]);
  const res = await auth.test!({ credential: cred }, down.ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("Bad Gateway"));
  const none = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
