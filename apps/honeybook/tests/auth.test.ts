import { assertEquals } from "@std/assert";
import oauth2 from "../auth/oauth2.ts";
import { errorBody, mockCtx, pathOf } from "./_helpers.ts";

const credential = { accessToken: "tok" };

Deno.test("auth: authorization code + PKCE against oauth.honeybook.com", () => {
  const cfg = oauth2.oauth2!;
  assertEquals(cfg.authorizationUrl, "https://oauth.honeybook.com/oauth2/auth");
  assertEquals(cfg.tokenUrl, "https://oauth.honeybook.com/oauth2/token");
  assertEquals(cfg.refreshUrl, "https://oauth.honeybook.com/oauth2/token");
  assertEquals(cfg.revokeUrl, "https://oauth.honeybook.com/oauth2/revoke");
  assertEquals(cfg.pkce, true);
  for (const s of ["openid", "honeybook.api", "offline_access", "projects.read"]) {
    assertEquals(cfg.scopes!.includes(s), true, s);
  }
});

Deno.test("auth: sign stamps a bearer token", async () => {
  const req = { url: "https://api.honeybook.com/api/v3/pipeline", method: "GET", headers: {} };
  const signed = await oauth2.sign!(
    { request: req, credential } as never,
    mockCtx().ctx,
  ) as typeof req;
  assertEquals((signed.headers as Record<string, string>)["authorization"], "Bearer tok");
});

Deno.test("auth: test passes on the documented { has_any } shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { has_any: true } }]);
  assertEquals(await oauth2.test({ credential }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/any");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("auth: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await oauth2.test({ credential }, ctx)).ok, false);
});

Deno.test("auth: insufficient scope proves the token is live", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("HBInsufficientScopeError", "no") }]);
  assertEquals((await oauth2.test({ credential }, ctx)).ok, true);
});

Deno.test("auth: an invalid token fails, by error_type and by bare 401", async () => {
  const a = mockCtx([{ status: 401, body: errorBody("HBInvalidJWTError", "bad") }]);
  assertEquals((await oauth2.test({ credential }, a.ctx)).ok, false);
  const b = mockCtx([{ status: 401, body: "nope" }]);
  assertEquals((await oauth2.test({ credential }, b.ctx)).ok, false);
});

Deno.test("auth: a 500 is a failure, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("HBInternalError", "x") }]);
  const out = await oauth2.test({ credential }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("auth: a missing accessToken fails without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await oauth2.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
