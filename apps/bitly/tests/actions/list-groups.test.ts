import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-groups.ts";

test("list-groups: GETs /groups and unwraps the groups array", async () => {
  const { ctx, calls } = mockCtx([{
    body: { groups: [{ guid: "Ba1bc23dE4F", name: "My Group", is_active: true }] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v4/groups");
  assertEquals(out.items.length, 1);
  assertEquals(out.items[0].guid, "Ba1bc23dE4F");
});

test("list-groups: passes organizationGuid as a query param when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { groups: [] } }]);
  await action.execute({ organizationGuid: "Oa1bc23dE4F" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("organization_guid"), "Oa1bc23dE4F");
});
