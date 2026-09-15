import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/event-get.ts";

Deno.test("event-get: GETs /events/{id}", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "1", type: "events", attributes: { start_at: "2026-10-01T18:00:00Z" } } },
  }]);
  const out = await action.execute({ eventId: "1" }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/events/1");
  assertEquals(out, { id: "1", type: "events", start_at: "2026-10-01T18:00:00Z" });
});
