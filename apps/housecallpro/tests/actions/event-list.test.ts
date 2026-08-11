import { assertEquals } from "@std/assert";
import eventList from "../../actions/event-list.ts";
import { mockCtx, page, pathOf } from "../_helpers.ts";

Deno.test("event-list: calls GET /events", async () => {
  const { ctx, calls } = mockCtx([{ body: page("events", [{ id: "ev1", name: "Team meeting" }]) }]);
  const out = await eventList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/events");
  assertEquals(out.items.length, 1);
});

Deno.test("event-list: says these are calendar events, not webhook events", () => {
  assertEquals(eventList.description?.includes("Not webhook events"), true);
});
