import { assertEquals } from "@std/assert";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/group-remove-user.ts";

Deno.test("group-remove-user: DELETEs /groups/{groupId}/users/{userId}", async () => {
  const { ctx, calls } = mockOktaCtx([{ status: 204 }]);
  await action.execute({ groupId: "00g1", userId: "00u1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/groups/00g1/users/00u1");
});
