import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invitation-revoke.ts";

test("invitation-revoke: POSTs to /invitations/{id}/revoke", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "inv_1", revoked: true } }]);
  await action.execute!({ invitationId: "inv_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/invitations/inv_1/revoke");
});
