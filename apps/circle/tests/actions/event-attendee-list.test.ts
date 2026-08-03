import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/event-attendee-list.ts";

Deno.test("event-attendee-list: GETs /event_attendees with the required event id", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await action.execute({ eventId: 2 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/event_attendees");
  assertEquals(queryOf(calls[0]), { event_id: ["2"] });
});

Deno.test("event-attendee-list: forwards pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ eventId: 2, page: 3, perPage: 100 }, ctx);
  assertEquals(queryOf(calls[0]), { event_id: ["2"], page: ["3"], per_page: ["100"] });
});

Deno.test("event-attendee-list: event id is required", () => {
  assertEquals(action.params!.find((p) => p.key === "eventId")!.required, true);
});
