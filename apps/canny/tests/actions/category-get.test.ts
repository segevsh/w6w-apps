import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import categoryGet from "../../actions/category-get.ts";
import { bodyOf, mockCtx } from "../_helpers.ts";

test("category-get: posts id to /v1/categories/retrieve", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1", name: "Dashboard" } }]);
  await categoryGet.execute({ id: "c1" }, ctx);

  assertEquals(calls[0].url, "https://canny.io/api/v1/categories/retrieve");
  assertEquals(bodyOf(calls[0]), { id: "c1" });
});
