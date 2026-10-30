import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import settlementList from "../../actions/settlement-list.ts";
import { collection, mockCtx, pathOf } from "../_helpers.ts";

test("settlement-list: lists /settlements", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "setl_1" }]) }]);
  const out = await settlementList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/settlements");
  assertEquals(out, collection([{ id: "setl_1" }]));
});
