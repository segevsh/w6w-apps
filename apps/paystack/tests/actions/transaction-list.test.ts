import { assertEquals } from "@std/assert";
import action from "../../actions/transaction-list.ts";
import { LIST_META, mockCtx, ok, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: maps filters to Paystack's query keys and returns {items, meta}", async () => {
  const rows = [{ id: 1 }];
  const { ctx, calls } = mockCtx([{ body: ok(rows, LIST_META) }]);
  const out = await action.execute({
    status: "success",
    channel: "card",
    customerCode: "CUS_1",
    source: "checkout",
    subaccountCode: "ACCT_1",
    splitCode: "SPL_1",
    from: "2026-01-01T00:00:00Z",
    perPage: 5,
    page: 2,
  }, ctx);
  assertEquals(out, { items: rows, meta: LIST_META });
  assertEquals(pathOf(calls[0].url), "/transaction");
  assertEquals(queryOf(calls[0].url), {
    perPage: "5",
    per_page: "5",
    page: "2",
    from: "2026-01-01T00:00:00Z",
    status: "success",
    channel: "card",
    customer_code: "CUS_1",
    source: "checkout",
    subaccount_code: "ACCT_1",
    split_code: "SPL_1",
  });
});

Deno.test("transaction-list: no filters sends no query, and a missing data array is empty", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: true, message: "ok" } }]);
  assertEquals(await action.execute({}, ctx), { items: [], meta: undefined });
  assertEquals(new URL(calls[0].url).search, "");
});
