import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import listBookings from "../../actions/list-bookings.ts";

test("list-bookings: sends the documented v2 filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0, items: [] } }]);
  await listBookings.execute({
    page: 1,
    size: 50,
    stayFilter: "ArrivalDate",
    stayFilterDate: "2026-08-01",
    trash: "All",
    includeCount: true,
    includeTransactions: true,
    updatedSince: "2026-01-01",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings");
  assertEquals(queryOf(calls[0].url), {
    page: "1",
    size: "50",
    stayFilter: "ArrivalDate",
    stayFilterDate: "2026-08-01",
    trash: "All",
    includeCount: "true",
    includeTransactions: "true",
    updatedSince: "2026-01-01",
  });
});
