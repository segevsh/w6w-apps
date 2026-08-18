import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[]) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: data.length } } },
});

/**
 * A group mapped to an IdP group is filled at sign-in, so editing its
 * membership in dbt Cloud reverts. Telling the two apart is the difference
 * between an access change that sticks and one that quietly does not.
 */
Deno.test("group-list: separates the groups the identity provider fills", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: 1, name: "Analytics", sso_mapping_groups: ["okta-analytics"] },
    { id: 2, name: "Contractors", sso_mapping_groups: [] },
    { id: 3, name: "Owners" },
  ])], { display });
  const result = await action.execute!({}, ctx) as { ssoManaged: string[]; count: number };
  assertEquals(calls[0].url.split("?")[0], "https://ab123.us1.dbt.com/api/v3/accounts/42/groups/");
  assertEquals(result.ssoManaged, ["Analytics"]);
  assertEquals(result.count, 3);
});

Deno.test("group-list: says permissions hang off groups rather than users", () => {
  assert(/permissions actually hang off/.test(action.description!), action.description);
});
