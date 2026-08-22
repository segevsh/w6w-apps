import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

/**
 * WorkOS links a later SSO sign-in to a verified address, so asserting one is a
 * security decision rather than a convenience — and the default is not to.
 */
Deno.test("user-create: does not claim the address is verified unless told to", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "user_1" } }]);
  await action.execute!({ email: "ada@acme.com", firstName: "Ada" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { email: "ada@acme.com", first_name: "Ada" });
  assertEquals(body.email_verified, undefined);
});

Deno.test("user-create: verification is sent only when asked for", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "user_1" } }]);
  await action.execute!({ email: "ada@acme.com", emailVerified: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).email_verified, true);
});

Deno.test("user-create: logs the id it made, not the address it was given", async () => {
  const { ctx, logs } = mockCtx([{ status: 201, body: { id: "user_1" } }]);
  await action.execute!({ email: "ada@acme.com" }, ctx);
  assertEquals(logs[0].data, { userId: "user_1" });
});

Deno.test("user-create: needs an email", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({ email: " " }, ctx), Error, "email");
  assertEquals(calls.length, 0);
});

/**
 * WorkOS accepts a `password` field. A workflow that sets one has it in its
 * inputs, its logs and its run history; invite and magic link do not.
 */
Deno.test("user-create: deliberately offers no password field", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.some((k) => /password/i.test(k)), keys.join(","));
});
