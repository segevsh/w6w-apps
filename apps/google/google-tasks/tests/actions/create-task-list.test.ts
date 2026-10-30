import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task-list.ts";

test("create-task-list: POSTs the title to /users/@me/lists", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "L9", title: "Groceries" } }]);
  await action.execute!({ title: "Groceries" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/tasks/v1/users/@me/lists");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { title: "Groceries" });
});

test("create-task-list: is not idempotent — Google mints a new id per call", () => {
  assertEquals(action.idempotent, false);
});
