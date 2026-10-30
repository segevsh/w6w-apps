import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-task-list.ts";

test("get-task-list: addresses the list under /users/@me/lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "L1", title: "My list" } }]);
  const out = await action.execute!({ taskList: "L1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/users/@me/lists/L1");
  assertEquals(calls[0].method, "GET");
  assertEquals((out as { title: string }).title, "My list");
});

test("get-task-list: percent-encodes the id into a single path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ taskList: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/users/@me/lists/a%2Fb%20c");
});

test("get-task-list: surfaces an upstream error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "not found" }]);
  const err = await assertRejects(
    async () => await action.execute!({ taskList: "nope" }, ctx),
    Error,
  );
  assert(err.message.includes("404"));
});
