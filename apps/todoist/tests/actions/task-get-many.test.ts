import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-get-many.ts";

Deno.test("task-get-many: GETs /tasks with mapped query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ projectId: "p1", label: "urgent", filter: "today" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/tasks");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("project_id"), "p1");
  assertEquals(url.searchParams.get("label"), "urgent");
  assertEquals(url.searchParams.get("filter"), "today");
  assertEquals(url.searchParams.has("section_id"), false);
});
