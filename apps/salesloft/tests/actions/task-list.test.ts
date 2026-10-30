import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

test("task-list: GETs /tasks with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ currentState: "scheduled", timeIntervalFilter: "overdue" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks");
  assertEquals(url.searchParams.get("current_state"), "scheduled");
  assertEquals(url.searchParams.get("time_interval_filter"), "overdue");
});
