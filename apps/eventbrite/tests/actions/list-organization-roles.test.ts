import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-organization-roles.ts";

test("list-organization-roles: GETs roles", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ organizationId: "org1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/org1/roles/");
  assertEquals(url.searchParams.get("continuation"), null);
  assertEquals(calls[0].body, null);
});
