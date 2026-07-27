import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get-many.ts";

Deno.test("task-get-many: GETs /list/{id}/task with filter query", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [] } }]);
  await action.execute!({
    listId: "9",
    archived: true,
    includeClosed: true,
    subtasks: true,
    orderBy: "updated",
    page: 2,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/list/9/task");
  assertEquals(url.searchParams.get("archived"), "true");
  assertEquals(url.searchParams.get("include_closed"), "true");
  assertEquals(url.searchParams.get("subtasks"), "true");
  assertEquals(url.searchParams.get("order_by"), "updated");
  assertEquals(url.searchParams.get("page"), "2");
});
