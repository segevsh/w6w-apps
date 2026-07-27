import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: PUTs /task/{id} and splits assignees into add/rem", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({
    taskId: "t1",
    name: "renamed",
    status: "done",
    addAssignees: [5],
    removeAssignees: [6, 7],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/task/t1");
  assertEquals(calls[0].method, "PUT");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.name, "renamed");
  assertEquals(body.status, "done");
  assertEquals(body.assignees, { add: [5], rem: [6, 7] });
});

Deno.test("task-update: omits assignees when none supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ taskId: "t1", name: "x" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("assignees" in body, false);
});
