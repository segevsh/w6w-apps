import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/interview-schedule-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

Deno.test("interview-schedule-list: filters by application or by stage", async () => {
  const byApp = mockCtx([page([{ id: "s1" }])]);
  await action.execute!({ applicationId: "a1" }, byApp.ctx);
  assertEquals(byApp.calls[0].url, "https://api.ashbyhq.com/interviewSchedule.list");
  assertEquals(JSON.parse(byApp.calls[0].body!).applicationId, "a1");

  const byStage = mockCtx([page([])]);
  await action.execute!({ interviewStageId: "st1" }, byStage.ctx);
  assertEquals(JSON.parse(byStage.calls[0].body!).interviewStageId, "st1");
});

Deno.test("interview-schedule-list: the date filter is converted to milliseconds", async () => {
  const { ctx, calls } = mockCtx([page([])]);
  await action.execute!({ createdAfter: "2026-08-18T12:00:00Z" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).createdAfter, 1787054400000);
});

Deno.test("interview-schedule-list: returns the sync token from a completed walk", async () => {
  const { ctx } = mockCtx([page([{ id: "s1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ returnAll: true }, ctx) as { syncToken: string };
  assertEquals(result.syncToken, "Rld2D");
});

/** A four-session onsite is ONE schedule; the times live on its events. */
Deno.test("interview-schedule-list: says a multi-session onsite is one schedule", () => {
  assert(/ONE schedule/.test(action.description!), action.description);
});
