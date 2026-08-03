import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-invite-get-many.ts";

Deno.test("organization-invite-get-many: GETs the pending invites as a bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "i1", email: "a@b.com" }] }]);
  const result = await action.execute({ organizationId: "org1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/organizations/org1/invites");
  assertEquals(result.items, [{ id: "i1", email: "a@b.com" }]);
  assertEquals(result.count, 1);
});
