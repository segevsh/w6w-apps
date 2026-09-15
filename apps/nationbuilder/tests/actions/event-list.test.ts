import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/event-list.ts";

Deno.test("event-list: GETs /events", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: [{ id: "1", type: "events", attributes: { start_at: "2026-10-01T18:00:00Z" } }] },
  }]);
  const out = await action.execute({}, ctx) as { items: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/events");
  assertEquals(out.items, [{ id: "1", type: "events", start_at: "2026-10-01T18:00:00Z" }]);
});
