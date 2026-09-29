import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-team-membership.ts";

Deno.test("delete-team-membership: DELETEs /team/memberships/{membershipId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ membershipId: "tm1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://webexapis.com/v1/team/memberships/tm1");
  assertEquals(result, { deleted: true });
});
