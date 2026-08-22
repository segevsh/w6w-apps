import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const credential = { apiKey: "abc123" };
const jwt = { apiKey: "header.payload.signature" };
const whoami = { status: 200, body: { id: 7, username: "ada", email: "ada@example.com" } };

Deno.test("api-key: signs as a bearer token", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer abc123");
});

/**
 * The point of this test: `/application` answers 200 with no credential, so a
 * credential test written against it would pass with no credential at all.
 */
Deno.test("api-key: tests against whoami, never against the fleet listing", async () => {
  const { ctx, calls } = mockCtx([whoami]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://api.balena-cloud.com/user/v1/whoami");
  assert(!calls.some((call) => call.url.includes("application")), "it must not probe /application");
  assertEquals(result.ok, true);
  assert(/authenticated as ada/.test(result.message!), result.message);
});

/** A session token works identically and expires. */
Deno.test("api-key: a JWT-shaped credential is called out as a session token", async () => {
  const { ctx } = mockCtx([whoami]);
  const result = await auth.test!({ credential: jwt } as never, ctx);
  assertEquals(result.ok, true);
  assert(/SESSION TOKEN/.test(result.message!), result.message);
  assert(/will expire/.test(result.message!), result.message);
});

Deno.test("api-key: an API key is not warned about", async () => {
  const { ctx } = mockCtx([whoami]);
  const result = await auth.test!({ credential } as never, ctx);
  assert(!/SESSION TOKEN/.test(result.message!), result.message);
});

Deno.test("api-key: a rejected credential fails with balena's explanation", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/fails only on the calls that need one/.test(result.message!), result.message);
});

Deno.test("api-key: an unreachable API fails rather than throwing", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

Deno.test("api-key: afterConnect records the username and the credential's kind", async () => {
  const key = mockCtx([whoami]);
  const display = await auth.afterConnect!({ credential }, key.ctx) as Record<string, unknown>;
  assertEquals(display.username, "ada");
  assertEquals(display.credentialKind, "API key");
  assertEquals(display.apiVersion, "v7");
  assert(!JSON.stringify(display).includes("abc123"), JSON.stringify(display));

  const session = mockCtx([whoami]);
  const other = await auth.afterConnect!({ credential: jwt }, session.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(other.credentialKind, "session token");
});

/** A failed whoami must not break connecting. */
Deno.test("api-key: afterConnect survives an unreachable API", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.username, "");
});
