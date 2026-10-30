import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-team-membership.ts";

test("update-team-membership: PUTs /team/memberships/{membershipId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tm1" } }]);
  await action.execute({ membershipId: "tm1", isModerator: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/team/memberships/tm1");
  assertEquals(JSON.parse(calls[0].body!), { isModerator: true });
});

test("update-team-membership: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
