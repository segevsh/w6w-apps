import { assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { errorsBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const cred = { accessToken: "tok-123" };

Deno.test("oauth2: declares Outreach's documented endpoints and no PKCE", () => {
  assertEquals(oauth2.type, "oauth2");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.outreach.io/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.outreach.io/oauth/token");
  assertEquals(oauth2.oauth2?.pkce, false);
  // Every scope is `<resource>.<read|write|delete|all>`.
  for (const s of oauth2.oauth2!.scopes!) {
    assertEquals(/^[a-zA-Z]+\.(read|write|delete|all)$/.test(s), true, s);
  }
});

Deno.test("oauth2.sign: stamps a Bearer header and nothing else", () => {
  const request = { url: "https://api.outreach.io/api/v2/users", method: "GET", headers: {} } as {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  const signed = oauth2.sign!(
    { request, credential: cred } as never,
    undefined as never,
  ) as typeof request;
  assertEquals(signed.headers, { authorization: "Bearer tok-123" });
});

Deno.test("oauth2.test: 200 passes; the probe asks for no attributes and no count", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ type: "user", id: 1 }] } }]);
  const res = await oauth2.test!({ credential: cred } as never, ctx);
  assertEquals(res, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v2/users");
  assertEquals(queryOf(calls[0].url), { "page[size]": "1", count: "false", "fields[user]": "" });
  assertEquals(calls[0].headers["authorization"], "Bearer tok-123");
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
});

Deno.test("oauth2.test: the gateway's 401 body fails the credential and names the reason", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "Invalid JWT token.", description: "The JWT token could not be decoded." },
  }]);
  const res = await oauth2.test!({ credential: cred } as never, ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(res.ok, false);
  assertEquals(res.message?.includes("Invalid JWT token."), true);
  assertEquals(res.message?.includes("tok-123"), false);
});

Deno.test("oauth2.test: a scope refusal (403 unauthorizedOauthScope) still proves the token is live", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorsBody("unauthorizedOauthScope", "Unauthorized OAuth Scope", "no users.read"),
  }]);
  assertEquals(await oauth2.test!({ credential: cred } as never, ctx), { ok: true });
});

Deno.test("oauth2.test: a governance refusal (403 unauthorizedRequest) also proves it", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorsBody("unauthorizedRequest", "Unauthorized Request", "not allowed"),
  }]);
  assertEquals(await oauth2.test!({ credential: cred } as never, ctx), { ok: true });
});

Deno.test("oauth2.test: a 403 with an unrecognised body is NOT taken as proof", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  const res = await oauth2.test!({ credential: cred } as never, ctx) as { ok: boolean };
  assertEquals(res.ok, false);
});

Deno.test("oauth2.test: rate limiting means the token was accepted", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: errorsBody("rateLimitExceeded", "Rate Limit Exceeded", "slow"),
  }]);
  assertEquals(await oauth2.test!({ credential: cred } as never, ctx), { ok: true });
});

Deno.test("oauth2.test: maintenance is a failure to verify, not a pass", async () => {
  const { ctx } = mockCtx([{
    status: 503,
    body: errorsBody("scheduledServerMaintenance", "Scheduled Server Maintenance", "later"),
  }]);
  const res = await oauth2.test!({ credential: cred } as never, ctx) as {
    ok: boolean;
    message?: string;
  };
  assertEquals(res.ok, false);
  assertEquals(res.message?.includes("maintenance"), true);
});

Deno.test("oauth2.test: other statuses fail with the status in the message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const res = await oauth2.test!({ credential: cred } as never, ctx) as { message?: string };
  assertEquals(res.message?.includes("500"), true);
});

Deno.test("oauth2.test: a credential without an access token never hits the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await oauth2.test!({ credential: {} } as never, ctx) as { ok: boolean };
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});
