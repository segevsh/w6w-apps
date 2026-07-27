import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invitee-get-many.ts";

Deno.test("invitee-get-many: GETs the event's invitees with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute(
    { event: "https://api.calendly.com/scheduled_events/DDDD", status: "active", email: "x@y.z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/scheduled_events/DDDD/invitees");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("email"), "x@y.z");
  assertEquals(calls[0].method, "GET");
});
