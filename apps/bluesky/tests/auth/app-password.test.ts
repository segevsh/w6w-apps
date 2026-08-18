import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/app-password.ts";

const session = {
  status: 200,
  body: {
    accessJwt: "access-1",
    refreshJwt: "refresh-1",
    did: "did:plc:me",
    handle: "me.bsky.social",
    active: true,
  },
};

const fields = {
  service: "https://bsky.social",
  identifier: "me.bsky.social",
  password: "abcd-efgh",
};

Deno.test("app-password: exchanges the password for a session once", async () => {
  const { ctx, calls } = mockCtx([session]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.server.createSession");
  assertEquals(JSON.parse(calls[0].body!), {
    identifier: "me.bsky.social",
    password: "abcd-efgh",
  });
  assertEquals(credential.accessJwt, "access-1");
  assertEquals(credential.refreshJwt, "refresh-1");
  assertEquals(credential.did, "did:plc:me");
});

Deno.test("app-password: a leading @ on the handle is stripped", async () => {
  const { ctx, calls } = mockCtx([session]);
  await auth.exchange!({ fields: { ...fields, identifier: "@me.bsky.social" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).identifier, "me.bsky.social");
});

/**
 * The app password is kept so a lost refresh token can be recovered from — and
 * that recovery is the only thing that spends the ~10/day session budget.
 */
Deno.test("app-password: the password is kept for recovery", async () => {
  const { ctx } = mockCtx([session]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(credential.password, "abcd-efgh");
});

/** A suspended account signs in successfully and then cannot post. */
Deno.test("app-password: an inactive account is refused at connect time", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { ...session.body, active: false, status: "suspended" },
  }]);
  await assertRejects(async () => await auth.exchange!({ fields }, ctx), Error, "not active");
});

Deno.test("app-password: a rejected password says it must be an app password", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "AuthenticationRequired", message: "Invalid identifier or password" },
  }]);
  const error = await assertRejects(async () => await auth.exchange!({ fields }, ctx), Error);
  assert(/APP PASSWORD/.test(error.message), error.message);
});

Deno.test("app-password: signs with the access token as a bearer", () => {
  const request = { url: "https://bsky.social/xrpc/x", headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { accessJwt: "access-1" } } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer access-1");
});

/**
 * The lexicon is explicit: refresh "Requires auth using the 'refreshJwt' (not
 * the 'accessJwt')". Signing it with the access token fails.
 */
Deno.test("app-password: refresh authenticates with the REFRESH token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { accessJwt: "access-2", refreshJwt: "refresh-2", did: "did:plc:me" },
  }]);
  await auth.refresh!({
    credential: { service: "https://bsky.social", accessJwt: "access-1", refreshJwt: "refresh-1" },
  }, ctx);
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.server.refreshSession");
  assertEquals(calls[0].headers["authorization"], "Bearer refresh-1");
});

/** The refresh token rotates — keeping the old one leaves the connection dead. */
Deno.test("app-password: refresh returns the NEW refresh token, not the old one", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { accessJwt: "access-2", refreshJwt: "refresh-2", did: "did:plc:me" },
  }]);
  const credential = await auth.refresh!({
    credential: { service: "https://bsky.social", accessJwt: "access-1", refreshJwt: "refresh-1" },
  }, ctx) as Record<string, unknown>;
  assertEquals(credential.accessJwt, "access-2");
  assertEquals(credential.refreshJwt, "refresh-2");
});

Deno.test("app-password: refresh keeps the rest of the credential intact", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { accessJwt: "access-2", refreshJwt: "refresh-2" },
  }]);
  const credential = await auth.refresh!({
    credential: {
      service: "https://bsky.social",
      identifier: "me.bsky.social",
      password: "abcd-efgh",
      refreshJwt: "refresh-1",
      did: "did:plc:me",
    },
  }, ctx) as Record<string, unknown>;
  assertEquals(credential.password, "abcd-efgh", "recovery still possible");
  assertEquals(credential.did, "did:plc:me");
});

/** A failed refresh means reconnecting, which costs one of the ten. */
Deno.test("app-password: a failed refresh says what reconnecting costs", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "ExpiredToken" } }]);
  const error = await assertRejects(
    async () =>
      await auth.refresh!({
        credential: { service: "https://bsky.social", refreshJwt: "refresh-1" },
      }, ctx),
    Error,
  );
  assert(/10 daily session creations/.test(error.message), error.message);
});

Deno.test("app-password: test reports the identity without spending a session creation", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { handle: "me.bsky.social", did: "did:plc:me", active: true },
  }]);
  const result = await auth.test!({
    credential: { service: "https://bsky.social", accessJwt: "access-1" },
  } as never, ctx);
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.server.getSession");
  assert(!calls[0].url.includes("createSession"), calls[0].url);
  assertEquals(result.ok, true);
  assert(/me.bsky.social/.test(result.message!), result.message);
});

Deno.test("app-password: test fails cleanly without a session, and when unreachable", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential: { accessJwt: "a" } } as never, offline);
  assertEquals(result.ok, false);
});

Deno.test("app-password: afterConnect records the DID every write depends on", () => {
  const display = auth.afterConnect!({
    credential: { service: "https://bsky.social", handle: "me.bsky.social", did: "did:plc:me" },
  }, mockCtx([]).ctx) as Record<string, unknown>;
  assertEquals(display, {
    service: "https://bsky.social",
    handle: "me.bsky.social",
    did: "did:plc:me",
  });
});

/** The reason this is `custom` rather than `basic`. */
Deno.test("app-password: is a session exchange, and says the password must be an app password", () => {
  assertEquals(auth.type, "custom");
  assert(auth.exchange, "no exchange hook");
  assert(auth.refresh, "no refresh hook");
  const field = auth.fields!.find((f) => f.key === "password")!;
  assert(/App passwords/.test(field.hint!), field.hint);
  assert(/APP PASSWORD/.test(auth.description!), auth.description);
});
