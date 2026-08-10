import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "transactions") }]);
  await transactionList.execute({
    siteId: "111",
    customerId: "456",
    nameOrEmail: "John",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/transactions");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[customer_id]"], "456");
  assertEquals(q["filter[name_or_email]"], "John");
  assertEquals(q["filter[start_date]"], "2026-01-01");
  assertEquals(q["filter[end_date]"], "2026-01-31");
});

Deno.test("transaction-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "transactions") }]);
  await transactionList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
