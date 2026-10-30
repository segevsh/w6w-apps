import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/catalog-item-list.ts";

test("catalog-item-list: GETs /catalogs/{name}/items with the name URL-encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({ catalogName: "my catalog" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/catalogs/my%20catalog/items");
});
