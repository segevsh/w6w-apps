import { assertEquals } from "@std/assert";
import customerSearch from "../../actions/customer-search.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-search: calls GET /customers and returns the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([{ id: 177737165 }], { total: 2 }) }]);
  const out = await customerSearch.execute({ limit: 50 }, ctx) as {
    items: unknown[];
    total: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/customers");
  assertEquals(queryOf(calls[0].url), { limit: "50" });
  assertEquals(out.total, 2);
});

Deno.test("customer-search: the filters are passed through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: listPage([]) }]);
  await customerSearch.execute(
    {
      keyword: "acme",
      email: "buyer@example.com",
      useExactEmailMatch: true,
      phone: "+1555",
      customerGroupIds: "123456,234567",
      taxExempt: false,
      acceptMarketing: true,
      createdFrom: "2026-01-15 00:00:00",
      sortBy: "LAST_ORDER_DATE_DESC",
    },
    ctx,
  );

  const query = queryOf(calls[0].url);
  assertEquals(query.keyword, "acme");
  assertEquals(query.useExactEmailMatch, "true");
  assertEquals(query.customerGroupIds, "123456,234567");
  assertEquals(query.taxExempt, "false");
  assertEquals(query.acceptMarketing, "true");
  assertEquals(query.sortBy, "LAST_ORDER_DATE_DESC");
});

Deno.test("customer-search: every sort option is one the vendor enumerates", () => {
  const param = customerSearch.params?.find((p) => p.key === "sortBy");
  const options = (param?.options ?? []) as Array<{ value: string }>;
  assertEquals(options.length, 16);
  for (
    const value of [
      "NAME_ASC",
      "EMAIL_DESC",
      "ORDER_COUNT_ASC",
      "REGISTERED_DATE_DESC",
      "UPDATED_DATE_ASC",
      "SALES_VALUE_DESC",
      "FIRST_ORDER_DATE_ASC",
      "LAST_ORDER_DATE_DESC",
    ]
  ) {
    assertEquals(options.some((o) => o.value === value), true, value);
  }
});
