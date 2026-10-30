import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import productList from "../../actions/product-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

test("product-list: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await productList.execute(
    { "search": "x-search", "limit": 7, "page": 7, "orderBy": "asc", "orderColumn": "id" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/products");
  assertEquals(queryOf(calls[0].url), {
    "search": "x-search",
    "limit": "7",
    "page": "7",
    "orderBy": "asc",
    "orderColumn": "id",
  });
  assertEquals(out, REPLY);
});

test("product-list: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await productList.execute({} as never, ctx);

  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("product-list: declares a read-only shape", () => {
  assertEquals(productList.type, "read");
  assertEquals(productList.idempotent, undefined);
  assertEquals(productList.params!.filter((p) => p.required).map((p) => p.key), []);
});
