import { assert, assertEquals } from "@std/assert";
import action from "../../actions/query-products.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("query-products: POSTs /stores/v3/products/query", async () => {
  const { ctx, calls } = mockCtx([{ body: { products: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/stores/v3/products/query");
  assertEquals(JSON.parse(calls[0].body!), { query: {} });
});

Deno.test("query-products: uses cursorPaging, not offset paging", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ limit: 10, cursor: "abc" }, ctx);
  const q = JSON.parse(calls[0].body!).query;
  assertEquals(q.cursorPaging, { limit: 10, cursor: "abc" });
  assert(!("paging" in q));
});

Deno.test("query-products: nests filter and sort under `query` but keeps `fields` outside it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    filter: { visible: { $eq: true } },
    sortFieldName: "createdDate",
    sortOrder: "ASC",
    fields: "CURRENCY, INFO_SECTION",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    query: {
      filter: { visible: { $eq: true } },
      sort: [{ fieldName: "createdDate", order: "ASC" }],
    },
    fields: ["CURRENCY", "INFO_SECTION"],
  });
});

Deno.test("query-products: is a search action", () => {
  assertEquals(action.type, "search");
});
