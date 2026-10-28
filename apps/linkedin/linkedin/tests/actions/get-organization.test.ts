import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-organization.ts";

Deno.test("get-organization: GETs /rest/organizations/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 79988552, localizedName: "FirstDemoCompany", vanityName: "firstdemocompany" } },
  ]);
  const out = await action.execute!({ organizationId: "79988552" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/organizations/79988552");
  assertEquals((out as { localizedName: string }).localizedName, "FirstDemoCompany");
});
