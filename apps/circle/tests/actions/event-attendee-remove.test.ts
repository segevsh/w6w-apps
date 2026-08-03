import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/event-attendee-remove.ts";

/**
 * The odd one out. This DELETE reads its two fields from a **JSON body**, where
 * the sibling `DELETE /space_members` and `DELETE /tagged_members` read theirs
 * from the query string. Transcribed from this endpoint's own definition, which
 * declares a `requestBody` and no `parameters` at all.
 */
Deno.test("event-attendee-remove: DELETEs with a BODY, not query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ eventId: 2, memberEmail: "a@b.c" }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/event_attendees");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(queryOf(calls[0]), {});
  assertEquals(JSON.parse(calls[0].body!), { event_id: 2, member_email: "a@b.c" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("event-attendee-remove: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
