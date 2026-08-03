import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/space-member-remove.ts";

/**
 * The add is a POST with a JSON body; this is a DELETE with QUERY parameters.
 * Same two fields, different transport — transcribed from this endpoint's own
 * parameter table rather than assumed by symmetry. Sending them as a body here
 * reaches a route that never sees them.
 */
Deno.test("space-member-remove: DELETEs with query parameters and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ email: "a@b.c", spaceId: 3 }, ctx);
  assertEquals(pathOf(calls[0]), "/api/admin/v2/space_members");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(queryOf(calls[0]), { email: ["a@b.c"], space_id: ["3"] });
});

Deno.test("space-member-remove: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
