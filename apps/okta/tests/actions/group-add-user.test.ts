import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockOktaCtx } from "../_helpers.ts";
import action from "../../actions/group-add-user.ts";

test("group-add-user: PUTs /groups/{groupId}/users/{userId}", async () => {
  const { ctx, calls } = mockOktaCtx([{ status: 204 }]);
  await action.execute({ groupId: "00g1", userId: "00u1" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://dev-1.okta.com/api/v1/groups/00g1/users/00u1");
});

test("group-add-user: is idempotent — PUT, and safe to retry", () => {
  assertEquals(action.idempotent, true);
});
