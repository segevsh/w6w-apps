import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/payment-get-many.ts";

Deno.test("payment-get-many: GETs /v2/payments with no query when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: { payments: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/payments");
});

Deno.test("payment-get-many: maps camelCase params onto Square's snake_case query", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    beginTime: "2026-01-01T00:00:00Z",
    endTime: "2026-02-01T00:00:00Z",
    sortField: "UPDATED_AT",
    sortOrder: "ASC",
    locationId: "L1",
    total: 1500,
    last4: "1111",
    cardBrand: "VISA",
    limit: 50,
    cursor: "abc",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("begin_time"), "2026-01-01T00:00:00Z");
  assertEquals(q.get("end_time"), "2026-02-01T00:00:00Z");
  assertEquals(q.get("sort_field"), "UPDATED_AT");
  assertEquals(q.get("sort_order"), "ASC");
  assertEquals(q.get("location_id"), "L1");
  assertEquals(q.get("total"), "1500");
  assertEquals(q.get("last_4"), "1111");
  assertEquals(q.get("card_brand"), "VISA");
  assertEquals(q.get("limit"), "50");
  assertEquals(q.get("cursor"), "abc");
});

Deno.test("payment-get-many: exposes the cursor in and out", async () => {
  const { ctx } = mockCtx([{ body: { payments: [], cursor: "next" } }]);
  const out = await action.execute({ cursor: "prev" }, ctx) as { cursor: string };
  assertEquals(out.cursor, "next");
  const outputKeys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(outputKeys.includes("cursor"));
  assert(action.params?.some((p) => p.key === "cursor"));
});

Deno.test("payment-get-many: the sort field options are Square's ListPayments enum", () => {
  const p = action.params?.find((p) => p.key === "sortField");
  assertEquals(
    optionValues(p),
    ["CREATED_AT", "UPDATED_AT", "OFFLINE_CREATED_AT"],
  );
});

Deno.test("payment-get-many: the location hint warns about the main-location default", () => {
  const p = action.params?.find((p) => p.key === "locationId");
  assert(/main location/i.test(p?.hint ?? ""), p?.hint);
});
