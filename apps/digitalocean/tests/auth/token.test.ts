import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

const cred = { token: "dop_v1_abc" };
const account = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    account: {
      email: "ops@example.com",
      uuid: "acct-1",
      status: "active",
      droplet_limit: 25,
      ...attributes,
    },
  },
});

Deno.test("token: signs as a bearer", () => {
  const request = {
    url: "https://api.digitalocean.com/v2/account",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer dop_v1_abc");
  assertEquals(auth.type, "bearer");
});

/** Listing works for a read-only token, so the test cannot tell them apart. */
Deno.test("token: the test says what it cannot determine", async () => {
  const { ctx, calls } = mockCtx([account()]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://api.digitalocean.com/v2/account");
  assertEquals(result.ok, true);
  assert(/ops@example\.com/.test(result.message!), result.message);
  assert(
    /cannot tell a read-only token from a read-write one/.test(result.message!),
    result.message,
  );
});

/** A locked account authenticates and refuses everything else. */
Deno.test("token: an inactive account fails the test with the reason", async () => {
  const { ctx } = mockCtx([account({ status: "locked" })]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/status is `locked` rather than active/.test(result.message!), result.message);
  assert(/the token works/.test(result.message!), result.message);
});

Deno.test("token: a rejected token surfaces the explanation", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { id: "unauthorized", message: "Unable to authenticate you" },
  }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/scoped read-only/.test(result.message!), result.message);
});

Deno.test("token: a missing token or an unreachable API fails cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, offline)).ok, false);
});

Deno.test("token: afterConnect records the account and its droplet limit", async () => {
  const { ctx } = mockCtx([account()]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals(display.email, "ops@example.com");
  assertEquals(display.accountId, "acct-1");
  assertEquals(display.dropletLimit, 25);
  assertEquals("token" in display, false);
});

Deno.test("token: afterConnect survives the call failing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

/** There is no per-resource scoping on a personal access token. */
Deno.test("token: says the token is the whole account", () => {
  assert(/carries the WHOLE account/.test(auth.description!), auth.description);
  assert(/READ-ONLY token is indistinguishable/.test(auth.description!), auth.description);
  const field = auth.fields!.find((f) => f.key === "token")!;
  assertEquals(field.type, "secret");
  assert(/can destroy every resource/.test(field.hint!), field.hint);
});
