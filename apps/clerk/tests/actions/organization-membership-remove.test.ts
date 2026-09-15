import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-membership-remove.ts";

Deno.test("organization-membership-remove: DELETEs the specific membership", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "orgmem_1" } }]);
  await action.execute!({ organizationId: "org_1", userId: "user_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/org_1/memberships/user_1");
});
