import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/scheduling-link-create.ts";

Deno.test("scheduling-link-create: POSTs the owner as an EventType", async () => {
  const { ctx, calls } = mockCtx([{ body: { resource: { booking_url: "https://x" } } }]);
  await action.execute({ owner: "https://api.calendly.com/event_types/CCCC" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/scheduling_links");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    max_event_count: 1,
    owner: "https://api.calendly.com/event_types/CCCC",
    owner_type: "EventType",
  });
});
