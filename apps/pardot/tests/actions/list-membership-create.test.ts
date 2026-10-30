import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockPardotCtx } from "../_helpers.ts";
import action from "../../actions/list-membership-create.ts";

test("list-membership-create: POSTs listId and prospectId (optedOut only when set)", async () => {
  const { ctx, calls } = mockPardotCtx([{
    status: 201,
    body: { id: 70000, listId: 500, prospectId: 20000 },
  }]);
  const out = await action.execute({ listId: 500, prospectId: 20000 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v5/objects/list-memberships");
  assertEquals(JSON.parse(calls[0].body!), { listId: 500, prospectId: 20000 });
  assertEquals(out, { id: 70000, listId: 500, prospectId: 20000 });
});

test("list-membership-create: optedOut false is sent, not dropped", async () => {
  const { ctx, calls } = mockPardotCtx([{ status: 201, body: {} }]);
  await action.execute({ listId: 500, prospectId: 20000, optedOut: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { listId: 500, prospectId: 20000, optedOut: false });
});

test("list-membership-create: refuses a bad id before any request", async () => {
  const { ctx, calls } = mockPardotCtx([]);
  await assertRejects(
    async () => await action.execute({ listId: -1, prospectId: 1 }, ctx),
    Error,
    "positive integer",
  );
  assertEquals(calls.length, 0);
});
