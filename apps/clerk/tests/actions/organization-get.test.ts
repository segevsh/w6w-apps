import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

Deno.test("organization-get: hits GET /organizations/{idOrSlug}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  await action.execute!({ organizationId: "acme" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/acme");
});
