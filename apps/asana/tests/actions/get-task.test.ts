import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-task.ts";

test("get-task: GETs /tasks/{id} and returns the whole envelope", async () => {
  const body = { data: { gid: "t-1", name: "hi" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ id: "t-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/tasks/t-1");
  assertEquals(out, body);
});

test("get-task: forwards opt_fields when set, omits when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }, { body: { data: {} } }]);
  await action.execute({ id: "t-1", opt_fields: "gid,name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("opt_fields"), "gid,name");

  await action.execute({ id: "t-1" }, ctx);
  assert(!new URL(calls[1].url).searchParams.has("opt_fields"));
});
