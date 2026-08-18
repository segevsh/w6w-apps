import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/interview-event-list.ts";

const page = (results: unknown[], extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { success: true, results, moreDataAvailable: false, ...extra },
});

Deno.test("interview-event-list: reads the sessions inside one schedule", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "e1" }, { id: "e2" }])]);
  const result = await action.execute!({ interviewScheduleId: "s1" }, ctx) as { count: number };
  assertEquals(calls[0].url, "https://api.ashbyhq.com/interviewEvent.list");
  assertEquals(JSON.parse(calls[0].body!).interviewScheduleId, "s1");
  assertEquals(result.count, 2);
});

/** There is no "every event this week" — Ashby requires a schedule. */
Deno.test("interview-event-list: needs a schedule id, and says why", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "interviewScheduleId");
  assertEquals(calls.length, 0);
  assert(/no way to ask for every event/.test(action.description!), action.description);
});

Deno.test("interview-event-list: returns the sync token from a completed walk", async () => {
  const { ctx } = mockCtx([page([{ id: "e1" }], { syncToken: "Rld2D" })]);
  const result = await action.execute!({ interviewScheduleId: "s1", returnAll: true }, ctx) as {
    syncToken: string;
  };
  assertEquals(result.syncToken, "Rld2D");
});
