import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-membership.ts";

Deno.test("get-membership: GETs /memberships/{membershipId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mb1" } }]);
  const result = await action.execute({ membershipId: "mb1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/memberships/mb1");
  assertEquals(result, { id: "mb1" });
});
