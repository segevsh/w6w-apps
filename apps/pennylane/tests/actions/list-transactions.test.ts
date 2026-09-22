import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-transactions.ts";

const PAGE = {
  items: [{ id: 77, label: "Card payment", amount: "-12.50" }],
  has_more: false,
  next_cursor: null,
};

Deno.test("list-transactions: GETs /transactions", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const res = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/external/v2/transactions");
  assertEquals(res, PAGE);
});

Deno.test("list-transactions: filters on a date range", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({
    filter: [
      { field: "date", operator: "gteq", value: "2026-01-01" },
      { field: "date", operator: "lteq", value: "2026-01-31" },
    ],
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("filter"),
    '[{"field":"date","operator":"gteq","value":"2026-01-01"},{"field":"date","operator":"lteq","value":"2026-01-31"}]',
  );
});
