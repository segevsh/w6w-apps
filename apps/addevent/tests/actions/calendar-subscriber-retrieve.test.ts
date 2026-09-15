import { assertEquals, assertRejects } from "@std/assert";
import calendarSubscriberRetrieve from "../../actions/calendar-subscriber-retrieve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("calendar-subscriber-retrieve: GETs by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "sub-1", calendar_id: "cal-1" } }]);
  const out = await calendarSubscriberRetrieve.execute({ subscriberId: "sub-1" }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/subscribers/sub-1");
  assertEquals(out.id, "sub-1");
});

Deno.test("calendar-subscriber-retrieve: a 404 on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(calendarSubscriberRetrieve.execute({ subscriberId: "missing" }, ctx)),
    Error,
  );
});
