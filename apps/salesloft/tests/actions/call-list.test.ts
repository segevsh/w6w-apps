import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/call-list.ts";

test("call-list: GETs /activities/calls with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ personId: 4, sentiment: "Positive" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/activities/calls");
  assertEquals(url.searchParams.get("person_id"), "4");
  assertEquals(url.searchParams.get("sentiment"), "Positive");
});
