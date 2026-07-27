import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/scheduled-event-get-many.ts";

Deno.test("scheduled-event-get-many: GETs /scheduled_events with mapped filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { collection: [] } }]);
  await action.execute(
    {
      organization: "org",
      status: "active",
      inviteeEmail: "a@b.com",
      minStartTime: "2026-07-27T00:00:00Z",
      count: 10,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/scheduled_events");
  assertEquals(url.searchParams.get("organization"), "org");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("invitee_email"), "a@b.com");
  assertEquals(url.searchParams.get("min_start_time"), "2026-07-27T00:00:00Z");
  assertEquals(url.searchParams.get("count"), "10");
});
