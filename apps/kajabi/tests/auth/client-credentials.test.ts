import { assert, assertEquals, assertRejects } from "@std/assert";
import auth from "../../auth/client-credentials.ts";
import { mockCtx } from "../_helpers.ts";

const CREDS = { clientId: "cid", clientSecret: "csec" };

const TOKEN = {
  access_token: "at-1",
  refresh_token: "rt-1",
  token_type: "Bearer",
  expires_in: 3600,
};

Deno.test("auth: exchange posts the client-credentials grant as form-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN }]);
  const cred = await auth.exchange!({ fields: CREDS }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/oauth/token");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "client_credentials");
  assertEquals(form.get("client_id"), "cid");
  assertEquals(form.get("client_secret"), "csec");

  assertEquals(cred.accessToken, "at-1");
  assertEquals(cred.refreshToken, "rt-1");
  assertEquals(cred.clientId, "cid");
  assert(typeof cred.expiresAt === "string");
});

/**
 * Kajabi's spec declares `client_id` / `client_secret` as **form properties**
 * and declares no `security` on this operation — unlike PayPal's same-named
 * grant, which uses HTTP Basic. Pinned so the two are not "harmonised".
 */
Deno.test("auth: credentials go in the body, not a Basic header", async () => {
  const { ctx, calls } = mockCtx([{ body: TOKEN }]);
  await auth.exchange!({ fields: CREDS }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("auth: expiresAt is derived from expires_in, with headroom for clock skew", async () => {
  const { ctx } = mockCtx([{ body: { ...TOKEN, expires_in: 3600 } }]);
  const before = Date.now();
  const cred = await auth.exchange!({ fields: CREDS }, ctx) as { expiresAt: string };
  const at = new Date(cred.expiresAt).getTime();
  // 3600s minus a 60s haircut, allowing a little slack for test execution time.
  assert(at <= before + 3540_000 + 2000, "no headroom applied");
  assert(at > before + 3400_000, "headroom far too large");
});

Deno.test("auth: exchange refuses blank fields without reaching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await auth.exchange!({ fields: { clientId: "", clientSecret: "" } }, ctx);
    },
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

/**
 * The real failure Kajabi returns for bad credentials, verified on the wire
 * (2026-08-03): HTTP 401 with the flat OAuth envelope. It must surface as a
 * throw carrying the vendor's own words, and must never echo the credential.
 */
Deno.test("auth: a bad client secret throws with Kajabi's message and no secret", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "application/json" },
    body: { error: "Invalid client credentials" },
  }]);
  const err = await assertRejects(
    async () => {
      await auth.exchange!({ fields: CREDS }, ctx);
    },
    Error,
  );
  assert(err.message.includes("401"));
  assert(err.message.includes("Invalid client credentials"));
  assert(!err.message.includes("csec"), "the client secret leaked into the error");
});

/** A 200 with no access_token is still a failure — status alone is not enough. */
Deno.test("auth: a 200 without an access token is treated as a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { token_type: "Bearer" } }]);
  await assertRejects(
    async () => {
      await auth.exchange!({ fields: CREDS }, ctx);
    },
    Error,
    "token request failed",
  );
});

Deno.test("auth: refresh prefers the refresh_token grant", async () => {
  const { ctx, calls } = mockCtx([{ body: { ...TOKEN, access_token: "at-2" } }]);
  const cred = await auth.refresh!({
    credential: { ...CREDS, accessToken: "at-1", refreshToken: "rt-1" },
  }, ctx) as Record<string, unknown>;

  const form = new URLSearchParams(calls[0].body!);
  assertEquals(form.get("grant_type"), "refresh_token");
  assertEquals(form.get("refresh_token"), "rt-1");
  assertEquals(cred.accessToken, "at-2");
});

/**
 * A refresh token expires on its own schedule, and rotating the API key
 * invalidates it. Falling back to a fresh client-credentials grant — which the
 * stored id and secret can always do — is the difference between a Connection
 * that self-heals and one an operator has to reconnect by hand.
 */
Deno.test("auth: a dead refresh token falls back to a fresh client-credentials grant", async () => {
  const { ctx, calls } = mockCtx([
    { status: 401, body: { error: "invalid_grant" } },
    { body: { ...TOKEN, access_token: "at-3" } },
  ]);
  const cred = await auth.refresh!({
    credential: { ...CREDS, accessToken: "at-1", refreshToken: "stale" },
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 2);
  assertEquals(new URLSearchParams(calls[0].body!).get("grant_type"), "refresh_token");
  assertEquals(new URLSearchParams(calls[1].body!).get("grant_type"), "client_credentials");
  assertEquals(cred.accessToken, "at-3");
});

/** When both grants fail the Connection really is dead — the error must escape. */
Deno.test("auth: refresh propagates when the key itself has been revoked", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: "invalid_grant" } },
    { status: 401, body: { error: "Invalid client credentials" } },
  ]);
  await assertRejects(
    async () => {
      await auth.refresh!({ credential: { ...CREDS, refreshToken: "stale" } }, ctx);
    },
    Error,
    "Invalid client credentials",
  );
});

/**
 * A refresh response that omits `refresh_token` must not silently strip the
 * connection's ability to refresh again.
 */
Deno.test("auth: a response without a refresh_token keeps the stored one", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "at-4", expires_in: 3600 } }]);
  const cred = await auth.refresh!({
    credential: { ...CREDS, refreshToken: "rt-keep" },
  }, ctx) as Record<string, unknown>;
  assertEquals(cred.refreshToken, "rt-keep");
});

Deno.test("auth: sign stamps the bearer token and makes no network call", () => {
  const request = { url: "https://api.kajabi.com/v1/me", headers: {} as Record<string, string> };
  const { ctx, calls } = mockCtx([]);
  const signed = auth.sign!(
    // deno-lint-ignore no-explicit-any
    { request, credential: { ...CREDS, accessToken: "at-1" } } as any,
    ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer at-1");
  // `sign` runs network-less — it stamps a header and returns.
  assertEquals(calls.length, 0);
});

Deno.test("auth: test probes /v1/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "1", type: "users", attributes: { name: "A", email: "a@b.c" } } },
  }]);
  const res = await auth.test({ credential: { ...CREDS, accessToken: "at-1" } }, ctx);
  assertEquals(res.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/me");
  assertEquals(calls[0].headers["authorization"], "Bearer at-1");
});

/**
 * The probe was chosen by reading its response schema, not its name: Kajabi's
 * `me_attributes` documents exactly `initials`, `name`, `email` and
 * `role_level`. This pins that no credential-shaped field is ever echoed back
 * out of the probe, the way Follow Up Boss's `/me` returns the caller's API key.
 */
Deno.test("auth: the /me probe returns no credential material", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        id: "1",
        type: "users",
        attributes: {
          initials: "JD",
          name: "John Doe",
          email: "j@d.com",
          role_level: "OWNER",
        },
      },
    },
  }]);
  const display = await auth.afterConnect!({
    credential: { ...CREDS, accessToken: "at-1" },
  }, ctx) as Record<string, unknown>;
  const serialised = JSON.stringify(display);
  assert(!serialised.includes("at-1"), "the access token reached the connection display");
  assert(!serialised.includes("csec"), "the client secret reached the connection display");
  assert(!serialised.includes("cid"), "the client id reached the connection display");
});

Deno.test("auth: test distinguishes 401 from 403", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { errors: [{ title: "Unauthorized", detail: "token expired" }] } },
    { status: 403, body: { errors: [{ title: "Forbidden", detail: "insufficient permission" }] } },
  ]);
  const cred = { credential: { ...CREDS, accessToken: "at-1" } };

  const unauthorized = await auth.test(cred, ctx);
  assertEquals(unauthorized.ok, false);
  assert(unauthorized.message!.includes("401"));
  assert(unauthorized.message!.includes("rotated"), "does not mention key rotation");

  const forbidden = await auth.test(cred, ctx);
  assertEquals(forbidden.ok, false);
  assert(forbidden.message!.includes("insufficient permission"));
});

Deno.test("auth: test fails closed without reaching the network when there is no token", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test({ credential: { ...CREDS } }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: afterConnect labels the connection with the key's user", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        id: "9",
        type: "users",
        attributes: { name: "Jo", email: "jo@x.com", role_level: "ADMINISTRATOR" },
      },
    },
  }]);
  const display = await auth.afterConnect!({
    credential: { ...CREDS, accessToken: "at-1" },
  }, ctx) as { user: Record<string, unknown> };
  assertEquals(display.user.name, "Jo");
  assertEquals(display.user.roleLevel, "ADMINISTRATOR");
});

/** A missing label must never block a Connection that authenticates. */
Deno.test("auth: afterConnect returns {} rather than throwing when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const display = await auth.afterConnect!({
    credential: { ...CREDS, accessToken: "at-1" },
  }, ctx);
  assertEquals(display, {});
});

Deno.test("auth: revoke posts the token to the revocation endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await auth.revoke!({ credential: { ...CREDS, accessToken: "at-1" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/oauth/revoke");
  assertEquals(new URLSearchParams(calls[0].body!).get("token"), "at-1");
});

/**
 * A user must be able to remove a Connection during a Kajabi outage — which is
 * precisely when they might most want to.
 */
Deno.test("auth: revoke never throws, even when Kajabi is unreachable", async () => {
  const { ctx } = mockCtx([]);
  await auth.revoke!({ credential: { ...CREDS, accessToken: "at-1" } }, ctx);
});
