import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockTeamworkCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

test("task-list: GETs /projects/api/v3/tasks.json and comma-joins id filters", async () => {
  const { ctx, calls } = mockTeamworkCtx([{ body: { tasks: [] } }]);
  await action.execute({ projectIds: "1, 2, 3", status: "late" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/projects/api/v3/tasks.json");
  assertEquals(url.searchParams.get("projectIds"), "1,2,3");
  assertEquals(url.searchParams.get("status"), "late");
});
