import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/catalog-list.ts";

test("catalog-list: GETs /catalogs with no query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { catalogs: [] } }], {
    display: { instance: "iad-01" },
  });
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/catalogs");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(result, { catalogs: [] });
});
