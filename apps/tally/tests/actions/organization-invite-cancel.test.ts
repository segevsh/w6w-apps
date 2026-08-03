import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-invite-cancel.ts";

Deno.test("organization-invite-cancel: DELETEs the invite and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute({ organizationId: "org1", inviteId: "i1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/organizations/org1/invites/i1");
  assertEquals(result, { inviteId: "i1", cancelled: true });
});
