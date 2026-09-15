import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-invitation-revoke.ts";

Deno.test("organization-invitation-revoke: POSTs to the org invitation's revoke path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "orginv_1", status: "revoked" } }]);
  await action.execute!({ organizationId: "org_1", invitationId: "orginv_1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/organizations/org_1/invitations/orginv_1/revoke",
  );
});
