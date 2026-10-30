import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-venues.ts";

test("list-venues: GET org venues", async () => {
  const { ctx, calls } = mockCtx([{ body: { venues: [], pagination: {} } }]);
  await action.execute!({ organizationId: "o1", continuation: "c" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/organizations/o1/venues/");
  assertEquals(url.searchParams.get("continuation"), "c");
});
