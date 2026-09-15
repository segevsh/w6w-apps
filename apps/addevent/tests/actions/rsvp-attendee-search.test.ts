import { assertEquals } from "@std/assert";
import rsvpAttendeeSearch from "../../actions/rsvp-attendee-search.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("rsvp-attendee-search: comma-joins the multiselect attending filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { rsvps: [], pagination: {}, links: {} } }]);

  await rsvpAttendeeSearch.execute(
    { eventIds: "evt-1", attending: ["going", "maybe"] },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/calevent/v2/rsvps");
  const q = queryOf(calls[0].url);
  assertEquals(q.event_ids, "evt-1");
  assertEquals(q.attending, "going,maybe");
});

Deno.test("rsvp-attendee-search: a zero-match result is a plain empty array, not an error", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { rsvps: [] } }]);
  const out = await rsvpAttendeeSearch.execute({}, ctx) as { rsvps: unknown[] };
  assertEquals(out.rsvps.length, 0);
});
