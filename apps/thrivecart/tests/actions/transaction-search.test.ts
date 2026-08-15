import { assertEquals } from "@std/assert";
import transactionSearch from "../../actions/transaction-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-search: calls GET /transactions with the search params", async () => {
  const { ctx, calls } = mockCtx([
    { body: { transactions: [{ event_id: "1" }], meta: { total: 1, results: 1 } } },
  ]);
  const out = await transactionSearch.execute(
    { page: 2, perPage: 25, query: "demo", transactionType: "refund", currency: "USD" },
    ctx,
  ) as { transactions: unknown[]; meta: { total: number } };
  assertEquals(pathOf(calls[0].url), "/api/external/transactions");
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("page"), "2");
  assertEquals(params.get("perPage"), "25");
  assertEquals(params.get("query"), "demo");
  assertEquals(params.get("transactionType"), "refund");
  assertEquals(params.get("currency"), "USD");
  assertEquals(out.transactions.length, 1);
  assertEquals(out.meta.total, 1);
});
