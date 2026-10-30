import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import categoryList from "../../actions/category-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("category-list: calls GET /category.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "cat1", name: "Plumbing" }] }]);
  const out = await categoryList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/category.json");
  assertEquals(out.items, [{ uuid: "cat1", name: "Plumbing" }]);
});
