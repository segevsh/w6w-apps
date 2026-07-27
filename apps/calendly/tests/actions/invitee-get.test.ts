import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invitee-get.ts";

Deno.test("invitee-get: addresses a nested invitee, extracting both UUIDs", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: {} } }]);
  await action.execute(
    {
      event: "https://api.calendly.com/scheduled_events/DDDD",
      invitee: "https://api.calendly.com/scheduled_events/DDDD/invitees/EEEE",
    },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/scheduled_events/DDDD/invitees/EEEE");
  assertEquals(calls[0].method, "GET");
});
