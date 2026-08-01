import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/item-get.ts";

Deno.test("item-get: GETs /Items/{id}", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Items: [{ ItemID: "it1" }] } }]);
  await action.execute({ itemId: "it1" }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Items/it1");
});
