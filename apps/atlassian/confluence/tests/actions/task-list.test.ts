import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

const display = { site: "acme" };

test("task-list: filters inline tasks by status, space and assignee", async () => {
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

test("task-list: createdAtFrom is sent as created-at-from, and omitted when empty", async () => {
  const withFilter = mockCtx([{ body: { results: [], _links: {} } }], { display });
  await action.execute!({ createdAtFrom: "1762776000000", limit: 5 }, withFilter.ctx);
  assertEquals(
    new URL(withFilter.calls[0].url).searchParams.get("created-at-from"),
    "1762776000000",
  );
  const without = mockCtx([{ body: { results: [], _links: {} } }], { display });
  await action.execute!({ createdAtFrom: "" }, without.ctx);
  assertEquals(new URL(without.calls[0].url).searchParams.has("created-at-from"), false);
});
