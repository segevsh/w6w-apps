import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/member-deactivate.ts";

Deno.test("member-deactivate: DELETEs /community_members/{id} with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ memberId: 11 }, ctx);
  assertEquals(calls[0].url, `${API}/community_members/11`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("member-deactivate: is described as deactivation, not deletion", () => {
  // Circle's own summary for this route is "Deactivate a community member".
  // Calling it a delete in the UI would promise destruction it does not do.
  assertEquals(/deactivate/i.test(action.description!), true);
  assertEquals(action.idempotent, true);
});
