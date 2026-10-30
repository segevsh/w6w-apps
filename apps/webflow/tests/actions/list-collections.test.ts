import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-collections.ts";

test("list-collections: GETs /v2/sites/{id}/collections", async () => {
  const body = { collections: [{ id: "c1" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ siteId: "s1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/sites/s1/collections");
  assertEquals(result, body);
});
