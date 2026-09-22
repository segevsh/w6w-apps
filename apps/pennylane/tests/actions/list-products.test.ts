import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-products.ts";

const PAGE = { items: [{ id: 1, label: "Product 1" }], has_more: false, next_cursor: null };

Deno.test("list-products: GETs /products", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/products");
  assertEquals(res, PAGE);
});

Deno.test("list-products: sends sort and a JSON filter", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({
    sort: "id",
    filter: [{ field: "label", operator: "eq", value: "Product 1" }],
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("sort"), "id");
  assertEquals(
    url.searchParams.get("filter"),
    '[{"field":"label","operator":"eq","value":"Product 1"}]',
  );
});
