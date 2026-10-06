import { assert, assertEquals } from "@std/assert";
import pat from "../../auth/personal-access-token.ts";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx } from "../_helpers.ts";

const ME = { id: "user_1", email: "a@b.co", display_name: "A B", plan: "free" };
const UNAUTH = { status: 401, body: "Unauthenticated", headers: { "content-type": "text/plain" } };

function signed(auth: typeof pat, credential: unknown) {
  const request = {
    url: "https://api.savvycal.com/v1/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  // deno-lint-ignore no-explicit-any
  return (auth.sign as any)({ request, credential }).headers;
}

Deno.test("pat: sign stamps the bearer header", () => {
  assertEquals(signed(pat, { token: "pt_secret_x" }), { authorization: "Bearer pt_secret_x" });
});

Deno.test("oauth2: sign stamps the access token and declares the documented endpoints", () => {
  assertEquals(signed(oauth2, { accessToken: "at" }), { authorization: "Bearer at" });
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://savvycal.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://savvycal.com/oauth/token");
});

Deno.test("pat: test passes on a JSON profile and probes /v1/me with the token", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  // deno-lint-ignore no-explicit-any
  const r = await (pat.test as any)({ credential: { token: " pt_secret_x " } }, ctx);
  assertEquals(r, { ok: true });
  assertEquals(calls[0].url, "https://api.savvycal.com/v1/me");
  assertEquals(calls[0].headers["authorization"], "Bearer pt_secret_x");
});

Deno.test("pat: test fails on the plain-text Unauthenticated body", async () => {
  const { ctx } = mockCtx([UNAUTH]);
  // deno-lint-ignore no-explicit-any
  const r = await (pat.test as any)({ credential: { token: "bad" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("Unauthenticated"));
  assert(!r.message.includes("bad"));
});

Deno.test("pat: a 200 that is not the profile shape is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  // deno-lint-ignore no-explicit-any
  const r = await (pat.test as any)({ credential: { token: "t" } }, ctx);
  assertEquals(r.ok, false);
});

Deno.test("pat: a 500 is reported by status, not as a rejected credential", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: "boom",
    headers: { "content-type": "text/plain" },
  }]);
  // deno-lint-ignore no-explicit-any
  const r = await (pat.test as any)({ credential: { token: "t" } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("500"));
});

Deno.test("pat/oauth2: test refuses a credential with no token without calling out", async () => {
  const { ctx, calls } = mockCtx([]);
  // deno-lint-ignore no-explicit-any
  assertEquals((await (pat.test as any)({ credential: {} }, ctx)).ok, false);
  // deno-lint-ignore no-explicit-any
  assertEquals((await (oauth2.test as any)({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes /v1/me with the access token", async () => {
  const { ctx, calls } = mockCtx([{ body: ME }]);
  // deno-lint-ignore no-explicit-any
  const r = await (oauth2.test as any)({ credential: { accessToken: "at" } }, ctx);
  assertEquals(r, { ok: true });
  assertEquals(calls[0].headers["authorization"], "Bearer at");
});

Deno.test("afterConnect publishes email and id only", async () => {
  const { ctx } = mockCtx([{ body: ME }, { body: ME }]);
  // deno-lint-ignore no-explicit-any
  const a = await (pat.afterConnect as any)({ credential: { token: "t" } }, ctx);
  // deno-lint-ignore no-explicit-any
  const b = await (oauth2.afterConnect as any)({ credential: { accessToken: "t" } }, ctx);
  assertEquals(a, { email: "a@b.co", userId: "user_1" });
  assertEquals(b, a);
});

Deno.test("afterConnect swallows a failed profile read", async () => {
  const { ctx } = mockCtx([UNAUTH]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await (pat.afterConnect as any)({ credential: { token: "t" } }, ctx), {});
});
