import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

const display = { site: "acme" };

Deno.test("task-list: filters inline tasks by status, space and assignee", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [{ id: "t1" }], _links: {} } }], {
    display,
  });
  const result = await action.execute!({
    status: "incomplete",
    spaceId: "101, 202",
    assignedTo: "acc1",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/tasks");
  assertEquals(q.get("status"), "incomplete");
  assertEquals(q.getAll("space-id"), ["101", "202"]);
  assertEquals(q.getAll("assigned-to"), ["acc1"]);
  assertEquals(result, [{ id: "t1" }]);
});
