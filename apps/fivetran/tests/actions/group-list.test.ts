import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/group-list.ts";

test("group-list: reads the groups", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "g1", name: "Production" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.fivetran.com/v1/groups");
  assertEquals(result.count, 1);
});

test("group-list: returnAll follows the cursor", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "g1" }], "cur"), page([{ id: "g2" }])]);
  const result = await action.execute!({ returnAll: true }, ctx) as { count: number };
  assertEquals(calls.length, 2);
  assertEquals(result.count, 2);
});

/** Fivetran's own summary for this endpoint is "List All Destinations". */
test("group-list: says a group is a destination", () => {
  assert(/group IS a destination/.test(action.description!), action.description);
});
