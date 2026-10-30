import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invitation-create.ts";

test("invitation-create: POSTs to /invitations", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "inv_1", status: "pending" } }]);
  await action.execute!({ emailAddress: "ada@example.com" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/invitations");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

test("invitation-create: requires an email address", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => await action.execute!({}, ctx), Error);
  assert(/emailAddress/.test(String(err)));
  assertEquals(calls.length, 0);
});
