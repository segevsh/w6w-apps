import { assertEquals } from "@std/assert";
import listPayments from "../../actions/list-payments.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const page = listEnvelope("payments", [{ id: "PM1", status: "submitted" }], {
  after: "C3",
  limit: 25,
});

Deno.test("list-payments: GET /payments with cursors surfaced", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await listPayments.execute!({ limit: 25, after: "C3" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/payments");
  assertEquals(out.afterCursor, "C3");
  assertEquals(out.limit, 25);
});

Deno.test("list-payments: charge_date uses the same bracketed form as created_at", async () => {
  const { ctx, calls } = mockCtx([{ body: page }]);
  await listPayments.execute!({
    currency: "EUR",
    customer: "CU1",
    creditor: "CR1",
    subscription: "SB1",
    mandate: "MD1",
    status: "confirmed",
    scheme: "sepa_core",
    sortField: "charge_date",
    sortDirection: "asc",
    chargeDateGte: "2026-03-01",
    chargeDateLte: "2026-03-31",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    currency: "EUR",
    customer: "CU1",
    creditor: "CR1",
    subscription: "SB1",
    mandate: "MD1",
    status: "confirmed",
    scheme: "sepa_core",
    sort_field: "charge_date",
    sort_direction: "asc",
    "charge_date[gte]": "2026-03-01",
    "charge_date[lte]": "2026-03-31",
  });
});
