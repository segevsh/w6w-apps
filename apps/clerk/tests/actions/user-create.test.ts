import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-create.ts";

Deno.test("user-create: posts an array-wrapped email, verified by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email_address, ["ada@example.com"]);
  assertEquals(sent.email_address_identification_status, ["verified"]);
});

/** False does not create a plain unverified address — it creates a "reserved" one. */
Deno.test("user-create: emailVerified=false creates the address `reserved`, not unverified", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({ emailAddress: "ada@example.com", emailVerified: false }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email_address_identification_status, ["reserved"]);
});

Deno.test("user-create: requires at least an email or a phone number", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/emailAddress.*phoneNumber|email or.*phone/.test(String(err)), String(err));
  assertEquals(calls.length, 0);
});

Deno.test("user-create: metadata is passed through as parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "user_1" } }]);
  await action.execute!({
    phoneNumber: "+15555550100",
    publicMetadata: '{"plan":"pro"}',
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.public_metadata, { plan: "pro" });
});
