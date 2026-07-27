import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs /tasks with mapped snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", content: "Buy milk" } }]);
  await action.execute!(
    {
      content: "Buy milk",
      projectId: "p1",
      sectionId: "s1",
      parentId: "t0",
      labels: ["Errand"],
      priority: 4,
      dueString: "tomorrow",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/v2/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    content: "Buy milk",
    project_id: "p1",
    section_id: "s1",
    parent_id: "t0",
    labels: ["Errand"],
    priority: 4,
    due_string: "tomorrow",
  });
});

Deno.test("task-create: omits empty label arrays and unset fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ content: "x", labels: [] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { content: "x" });
});
