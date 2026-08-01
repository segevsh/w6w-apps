import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-get-many.ts";

Deno.test("time-entry-get-many: GETs /time_entries with snake_case query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { time_entries: [], total_entries: 0 } }]);
  await action.execute(
    { projectId: "1", taskId: "2", isRunning: true, from: "2026-01-01", to: "2026-01-31" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/time_entries");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("project_id"), "1");
  assertEquals(url.searchParams.get("task_id"), "2");
  assertEquals(url.searchParams.get("is_running"), "true");
  assertEquals(url.searchParams.get("from"), "2026-01-01");
  assertEquals(url.searchParams.get("to"), "2026-01-31");
});

Deno.test("time-entry-get-many: omits unset filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { time_entries: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals([...url.searchParams.keys()].length, 0);
});
