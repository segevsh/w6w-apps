import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-entry-create.ts";

Deno.test("time-entry-create: POSTs /team/{id}/time_entries with ms start + duration", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "te1" } } }]);
  await action.execute!({
    teamId: "42",
    taskId: "t1",
    start: "2026-08-01T00:00:00.000Z",
    duration: 30,
    billable: true,
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/api/v2/team/42/time_entries");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tid, "t1");
  assertEquals(body.start, Date.parse("2026-08-01T00:00:00.000Z"));
  assertEquals(body.duration, 30 * 60000);
  assertEquals(body.billable, true);
});
