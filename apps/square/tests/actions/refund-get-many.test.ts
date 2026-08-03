import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/refund-get-many.ts";

Deno.test("refund-get-many: GETs /v2/refunds and maps the filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { refunds: [] } }]);
  await action.execute({
    beginTime: "2026-01-01T00:00:00Z",
    sortField: "UPDATED_AT",
    sortOrder: "ASC",
    locationId: "L1",
    status: "COMPLETED",
    sourceType: "CARD",
    limit: 10,
    cursor: "c1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/refunds");
  assertEquals(url.searchParams.get("begin_time"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("sort_field"), "UPDATED_AT");
  assertEquals(url.searchParams.get("sort_order"), "ASC");
  assertEquals(url.searchParams.get("location_id"), "L1");
  assertEquals(url.searchParams.get("status"), "COMPLETED");
  assertEquals(url.searchParams.get("source_type"), "CARD");
  assertEquals(url.searchParams.get("limit"), "10");
  assertEquals(url.searchParams.get("cursor"), "c1");
});

Deno.test("refund-get-many: the status options are Square's four PaymentRefund states", () => {
  const p = action.params?.find((p) => p.key === "status");
  assertEquals(
    optionValues(p),
    ["PENDING", "COMPLETED", "REJECTED", "FAILED"],
  );
});

Deno.test("refund-get-many: documents that omitting the location spans every location", () => {
  const p = action.params?.find((p) => p.key === "locationId");
  assertEquals(p?.required, false);
  assert(/every location/i.test(p?.hint ?? ""), p?.hint);
});
