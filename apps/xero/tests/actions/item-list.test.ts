import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/item-list.ts";

test("item-list: GETs /Items and forwards where/order", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Items: [] } }]);
  await action.execute({ where: "IsSold==true", order: "Code ASC" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api.xro/2.0/Items");
  assertEquals(url.searchParams.get("where"), "IsSold==true");
  assertEquals(url.searchParams.get("order"), "Code ASC");
});
