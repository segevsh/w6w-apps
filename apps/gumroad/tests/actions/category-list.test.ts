import { assertEquals, assertRejects } from "@std/assert";
import categoryList from "../../actions/category-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {};

Deno.test("category-list: sends GET /v2/categories with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "categories": [{ "id": "a" }] } }]);
  await categoryList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/categories");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("category-list: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true, "categories": [{ "id": "a" }] } }]);
  assertEquals(await categoryList.execute(INPUT, ctx), { "categories": [{ "id": "a" }] });
});

Deno.test("category-list: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(() => Promise.resolve(categoryList.execute(INPUT, ctx)), Error);
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("category-list: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(() => Promise.resolve(categoryList.execute(INPUT, ctx)), Error, "refused");
});
