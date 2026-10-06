import { assert, assertEquals } from "@std/assert";
import oauth2, { SCOPES } from "../../auth/oauth2.ts";
import { API, mockCtx } from "../_helpers.ts";

const cred = { accessToken: "tok-123" };

Deno.test("oauth2: endpoints are Podium's documented authorize and token URLs", () => {
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.podium.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.podium.com/oauth/token");
  assertEquals(oauth2.oauth2?.pkce, false);
  assertEquals(oauth2.oauth2?.scopes, SCOPES);
});

Deno.test("oauth2: requested scopes are all from the documented scope table", () => {
  assertEquals(new Set(SCOPES).size, SCOPES.length);
  for (const s of SCOPES) assert(/^(read|write)_[a-z_]+$/.test(s), s);
});

Deno.test("oauth2: sign sets a Bearer authorization header", () => {
  const req = { url: `${API}/x`, method: "GET", headers: {} as Record<string, string> };
  const out = oauth2.sign!({ request: req, credential: cred } as never, {} as never) as typeof req;
  assertEquals(out.headers["authorization"], "Bearer tok-123");
});

Deno.test("oauth2: test passes on a 200 from the scope-free webhooks list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], metadata: {} } }]);
  const res = await oauth2.test({ credential: cred } as never, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, `${API}/webhooks`);
  assertEquals(calls[0].headers["authorization"], "Bearer tok-123");
});

Deno.test("oauth2: test fails on Podium's unauthorized code, reading the body not just the status", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", message: "ID token has invalid signature" },
  }]);
  const res = await oauth2.test({ credential: cred } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("invalid signature"));
  assert(!res.message?.includes("tok-123"));
});

Deno.test("oauth2: test reports other failures with the vendor code and a missing token without a call", async () => {
  const { ctx, calls } = mockCtx([{ status: 429, body: { code: "rate_limit", message: "slow" } }]);
  const res = await oauth2.test({ credential: cred } as never, ctx);
  assertEquals(res, { ok: false, message: "Podium returned 429 rate_limit" });
  const none = await oauth2.test({ credential: {} } as never, ctx);
  assertEquals(none.ok, false);
  assertEquals(calls.length, 1);
});
