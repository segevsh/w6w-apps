import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-team-membership.ts";

Deno.test("update-team-membership: PUTs /team/memberships/{membershipId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tm1" } }]);
  await action.execute({ membershipId: "tm1", isModerator: true }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://webexapis.com/v1/team/memberships/tm1");
  assertEquals(JSON.parse(calls[0].body!), { isModerator: true });
});

Deno.test("update-team-membership: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
