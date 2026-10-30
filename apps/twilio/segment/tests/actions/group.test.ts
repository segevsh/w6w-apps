import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group.ts";

test("group: posts groupId + userId + traits to /group", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { groupId: "g1", userId: "u1", traits: { name: "Acme" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.segment.io/v1/group");
  assertEquals(JSON.parse(calls[0].body!), {
    groupId: "g1",
    userId: "u1",
    traits: { name: "Acme" },
  });
  assertEquals(result, { success: true });
});

test("group: rejects a blank groupId", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ groupId: "  ", userId: "u1" }, ctx),
    Error,
    "`groupId` is required",
  );
  assertEquals(calls.length, 0);
});

test("group: rejects when neither userId nor anonymousId is set", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ groupId: "g1" }, ctx),
    Error,
    "either `userId` or `anonymousId` is required",
  );
});
