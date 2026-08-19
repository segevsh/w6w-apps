import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

const cred = { token: "9876987698769876987698769876987698769876" };

Deno.test("access-token: signs as a bearer", () => {
  const request = {
    url: "https://api.particle.io/v1/devices",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: cred } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], `Bearer ${cred.token}`);
  assertEquals(auth.type, "bearer");
});

Deno.test("access-token: the test names the account", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "ops@example.com" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(calls[0].url, "https://api.particle.io/v1/user");
  assertEquals(result.ok, true);
  assert(/ops@example\.com/.test(result.message!), result.message);
});

/** A product token has no user behind it, and that is a working credential. */
Deno.test("access-token: a 403 on /v1/user is a product token, not a failure", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "forbidden" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, true);
  assert(/PRODUCT token/.test(result.message!), result.message);
});

Deno.test("access-token: a rejected token names expiry as a cause", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid_token" } }]);
  const result = await auth.test!({ credential: cred } as never, ctx);
  assertEquals(result.ok, false);
  assert(/90 days/.test(result.message!), result.message);
});

Deno.test("access-token: a missing token or an unreachable API fails cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const offline = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  assertEquals((await auth.test!({ credential: cred } as never, offline)).ok, false);
});

Deno.test("access-token: afterConnect records which kind of token this is", async () => {
  const user = mockCtx([{ status: 200, body: { username: "ops@example.com" } }]);
  const userDisplay = await auth.afterConnect!({ credential: cred }, user.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(userDisplay.username, "ops@example.com");
  assertEquals(userDisplay.tokenKind, "user");

  const product = mockCtx([{ status: 403, body: {} }]);
  const productDisplay = await auth.afterConnect!({ credential: cred }, product.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(productDisplay.tokenKind, "product");
  assertEquals(productDisplay.username, undefined);
});

Deno.test("access-token: afterConnect survives another failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

/** There is no per-device scoping on a user token. */
Deno.test("access-token: says the token is the whole fleet, and that it expires", () => {
  assert(/carries the whole device fleet/.test(auth.description!), auth.description);
  assert(/EXPIRES AFTER 90 DAYS/.test(auth.description!), auth.description);
  const field = auth.fields!.find((f) => f.key === "token")!;
  assertEquals(field.type, "secret");
  assert(/PRODUCT token narrows this/.test(field.hint!), field.hint);
});
