import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event-schedule.ts";

Deno.test("create-event-schedule: POSTs wrapped schedule", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "sch" } }]);
  await action.execute!(
    {
      eventId: "9",
      occurrenceDuration: 3600,
      recurrenceRule: "DTSTART:20261201T023000Z\nRRULE:FREQ=WEEKLY;COUNT=5",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/9/schedules/");
  assertEquals(JSON.parse(calls[0].body!), {
    schedule: {
      occurrence_duration: 3600,
      recurrence_rule: "DTSTART:20261201T023000Z\nRRULE:FREQ=WEEKLY;COUNT=5",
    },
  });
});
