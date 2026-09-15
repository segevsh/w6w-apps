import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-invitation-list.ts";

Deno.test("organization-invitation-list: unwraps the envelope and passes status through", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "orginv_1" }], total_count: 1 },
  }]);
  const out = await action.execute!({ organizationId: "org_1", status: "pending" }, ctx) as {
    data: unknown[];
  };
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/org_1/invitations");
  assertEquals(new URL(calls[0].url).searchParams.get("status"), "pending");
  assertEquals(out.data.length, 1);
});
