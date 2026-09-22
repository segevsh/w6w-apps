import { assertEquals } from "@std/assert";
import reservationList from "../../actions/reservation-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("reservation-list: GET /getReservations with the given filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ reservationID: "res1" }], { count: 1, total: 1 }),
  }]);
  await reservationList.execute({ status: "confirmed", modifiedFrom: "2026-09-01" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getReservations");
  assertEquals(queryOf(calls[0].url), { status: "confirmed", modifiedFrom: "2026-09-01" });
});

Deno.test("reservation-list: every filter is optional — an empty call is valid", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await reservationList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("reservation-list: booleans survive false (e.g. sortByRecent=false is meaningful)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await reservationList.execute({ sortByRecent: false, includeGuestsDetails: true }, ctx);
  assertEquals(queryOf(calls[0].url), { sortByRecent: "false", includeGuestsDetails: "true" });
});
