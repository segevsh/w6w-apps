import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

const cred = { url: "https://mastodon.social", token: "tok" };

Deno.test("access-token: signs as a bearer", () => {
  const request = {
    url: "https://mastodon.social/api/v1/x",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer tok");
  assertEquals(auth.type, "bearer");
});

Deno.test("access-token: the test verifies the credential and names the account", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "alice" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/accounts/verify_credentials");
  assertEquals(result.ok, true);
  assertEquals(result.message, "connected as @alice@mastodon.social");
});

/** A token from another server is invalid, and the 401 says nothing about why. */
Deno.test("access-token: a rejection points at the instance as well as the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "The access token is invalid" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/issued by ONE instance/.test(result.message!), result.message);
  assert(/token from another server/.test(result.message!), result.message);
});

Deno.test("access-token: a handle in the URL field resolves to the instance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "alice" } }]);
  await auth.test!({ credential: { ...cred, url: "@alice@hachyderm.io" } } as never, ctx);
  assert(calls[0].url.startsWith("https://hachyderm.io/"), calls[0].url);
});

Deno.test("access-token: a non-JSON body is named as a proxy or landing page", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/proxy or a landing page/.test(result.message!), result.message);
});

Deno.test("access-token: missing fields and an unreachable host fail cleanly", async () => {
  for (const credential of [{ token: "t" }, { url: "https://x.social" }]) {
    const { ctx, calls } = mockCtx([]);
    assertEquals((await auth.test!({ credential } as never, ctx)).ok, false);
    assertEquals(calls.length, 0);
  }
  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, offline)).ok, false);
});

/** Every post is checked against these, and they are per-instance. */
Deno.test("access-token: afterConnect records the instance's own limits", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { username: "alice" } },
    {
      status: 200,
      body: {
        version: "4.7.0",
        configuration: { statuses: { max_characters: 5000, max_media_attachments: 8 } },
      },
    },
  ]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assert(calls[1].url.endsWith("/api/v2/instance"), calls[1].url);
  assertEquals(display.maxCharacters, 5000);
  assertEquals(display.maxMedia, 8);
  assertEquals(display.version, "4.7.0");
  assertEquals(display.acct, "@alice@mastodon.social");
});

/** The limits matter more than the label, so a failed lookup does not lose them. */
Deno.test("access-token: the limits are still recorded when the identity call fails", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: {} },
    { status: 200, body: { configuration: { statuses: { max_characters: 1000 } } } },
  ]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.maxCharacters, 1000);
  assertEquals(display.acct, "mastodon.social", "the host stands in for the label");
});

Deno.test("access-token: afterConnect survives both calls failing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }, { status: 500, body: {} }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.url, "https://mastodon.social");
});

/** There is no central Mastodon, so there is no central OAuth client. */
Deno.test("access-token: says why this is a token rather than OAuth", () => {
  assert(/no central OAuth client/.test(auth.description!), auth.description);
  const token = auth.fields!.find((f) => f.key === "token")!;
  assert(/cannot be widened afterwards/.test(token.hint!), token.hint);
  assertEquals(token.type, "secret");
});
