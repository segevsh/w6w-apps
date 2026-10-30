import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-membership.ts";

test("update-membership: PUTs /memberships/{membershipId} with both required flags", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mb1" } }]);
  await action.execute({ membershipId: "mb1", isModerator: true, isRoomHidden: false }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/memberships/mb1");
  assertEquals(JSON.parse(calls[0].body!), { isModerator: true, isRoomHidden: false });
});

test("update-membership: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
