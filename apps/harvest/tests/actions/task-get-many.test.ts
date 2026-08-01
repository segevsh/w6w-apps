import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get-many.ts";

Deno.test("task-get-many: GETs /tasks with snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { tasks: [] } }]);
  await action.execute({ isActive: false, perPage: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks");
  assertEquals(url.searchParams.get("is_active"), "false");
  assertEquals(url.searchParams.get("per_page"), "50");
});
