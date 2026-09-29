import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-membership.ts";

Deno.test("delete-membership: DELETEs /memberships/{membershipId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ membershipId: "mb1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://webexapis.com/v1/memberships/mb1");
  assertEquals(result, { deleted: true });
});
