import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/search-orders.ts";
import { mockCtx } from "../_helpers.ts";

test("search-orders: POSTs /ecom/v1/orders/search wrapping everything in `search`", async () => {
  const { ctx, calls } = mockCtx([{ body: { orders: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/ecom/v1/orders/search");
  assertEquals(JSON.parse(calls[0].body!), { search: {} });
});

test("search-orders: sends filter, sort and cursor paging inside `search`", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    filter: { paymentStatus: { $eq: "PAID" } },
    sortFieldName: "createdDate",
    sortOrder: "DESC",
    limit: 2,
    cursor: "tok",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    search: {
      filter: { paymentStatus: { $eq: "PAID" } },
      sort: [{ fieldName: "createdDate", order: "DESC" }],
      cursorPaging: { limit: 2, cursor: "tok" },
    },
  });
});

test("search-orders: wraps free text in the `expression` object eCommerce expects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ search: "ada@example.com" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).search.search, { expression: "ada@example.com" });
});

test("search-orders: is a search action", () => {
  assertEquals(action.type, "search");
});
