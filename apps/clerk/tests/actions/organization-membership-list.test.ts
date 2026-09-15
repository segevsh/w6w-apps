import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-membership-list.ts";

Deno.test("organization-membership-list: unwraps the envelope for a given org", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "orgmem_1" }], total_count: 1 },
  }]);
  const out = await action.execute!({ organizationId: "org_1" }, ctx) as { data: unknown[] };
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/org_1/memberships");
  assertEquals(out.data.length, 1);
});
