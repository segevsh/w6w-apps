import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-get-many.ts";

Deno.test("comment-get-many: GETs /comments filtered by task_id", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ taskId: "t1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/comments");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("task_id"), "t1");
  assertEquals(url.searchParams.has("project_id"), false);
});

Deno.test("comment-get-many: rejects when neither taskId nor projectId is given", () => {
  const { ctx } = mockCtx();
  assertThrows(
    () => action.execute!({}, ctx),
    Error,
    "requires either taskId or projectId",
  );
});
