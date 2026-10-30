import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recipient-update.ts";

test("recipient-update: sends only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "rcp_1" } }]);
  await action.execute!({ recipientId: "rcp_1", name: "Neiman Runtilly" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { name: "Neiman Runtilly" });
});

test("recipient-update: does not offer a way to change phone", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assertEquals(keys.includes("phone"), false);
  assert(/phone.*cannot change/i.test(action.description!), action.description);
});

test("recipient-update: recipientId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "recipientId");
  assertEquals(calls.length, 0);
});

test("recipient-update: refuses an empty update", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ recipientId: "rcp_1" }, ctx),
    Error,
    "no fields",
  );
  assertEquals(calls.length, 0);
});
