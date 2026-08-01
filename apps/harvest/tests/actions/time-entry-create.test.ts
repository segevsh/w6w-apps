import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-create.ts";

Deno.test("time-entry-create: POSTs /time_entries with a duration body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, hours: 2 } }]);
  await action.execute(
    { projectId: "1", taskId: "2", spentDate: "2026-07-01", hours: 2, notes: "wrote code" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/time_entries");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: "1",
    task_id: "2",
    spent_date: "2026-07-01",
    hours: 2,
    notes: "wrote code",
  });
});

Deno.test("time-entry-create: a start/end body omits hours", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute(
    {
      projectId: "1",
      taskId: "2",
      spentDate: "2026-07-01",
      startedTime: "8:00am",
      endedTime: "5:00pm",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: "1",
    task_id: "2",
    spent_date: "2026-07-01",
    started_time: "8:00am",
    ended_time: "5:00pm",
  });
});

Deno.test("time-entry-create: omitting hours and times starts a running timer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, is_running: true } }]);
  await action.execute({ projectId: "1", taskId: "2", spentDate: "2026-07-01" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: "1",
    task_id: "2",
    spent_date: "2026-07-01",
  });
});
