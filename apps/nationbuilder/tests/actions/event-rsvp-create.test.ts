import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/event-rsvp-create.ts";

Deno.test("event-rsvp-create: POSTs /event_rsvps", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "9", type: "event_rsvps", attributes: { event_id: "1" } } },
  }]);
  const out = await action.execute({
    eventId: "1",
    firstName: "Kim",
    lastName: "Possible",
    email: "k@e.com",
  }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/event_rsvps");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "event_rsvps",
      attributes: {
        event_id: "1",
        first_name: "Kim",
        last_name: "Possible",
        email: "k@e.com",
      },
    },
  });
  assertEquals(out, { id: "9", type: "event_rsvps", event_id: "1" });
});
