import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-create.ts";

Deno.test("comment-create: POSTs /comments targeting a task", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ content: "Nice", taskId: "t1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/comments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { content: "Nice", task_id: "t1" });
});

Deno.test("comment-create: targets a project when taskId is absent", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await action.execute!({ content: "Hi", projectId: "p1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { content: "Hi", project_id: "p1" });
});

Deno.test("comment-create: rejects when neither taskId nor projectId is given", () => {
  const { ctx } = mockCtx();
  assertThrows(
    () => action.execute!({ content: "orphan" }, ctx),
    Error,
    "requires either taskId or projectId",
  );
});
