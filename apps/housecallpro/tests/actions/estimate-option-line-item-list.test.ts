import { assertEquals } from "@std/assert";
import estimateOptionLineItemList from "../../actions/estimate-option-line-item-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("estimate-option-line-item-list: nests option under estimate in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: page("line_items", [{ id: "li1" }]) }]);
  const out = await estimateOptionLineItemList.execute(
    { estimateId: "e1", optionId: "o1", page: 1, pageSize: 50 },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/estimates/e1/options/o1/line_items");
  assertEquals(queryOf(calls[0].url), { page: "1", page_size: "50" });
  assertEquals(out.items, [{ id: "li1" }]);
});

Deno.test("estimate-option-line-item-list: both ids escape independently", async () => {
  const { ctx, calls } = mockCtx([{ body: page("line_items", []) }]);
  await estimateOptionLineItemList.execute({ estimateId: "e/1", optionId: "o?1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/estimates/e%2F1/options/o%3F1/line_items");
});
