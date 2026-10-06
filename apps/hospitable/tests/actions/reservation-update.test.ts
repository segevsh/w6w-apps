import { assertEquals } from "@std/assert";
import reservationUpdate from "../../actions/reservation-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("reservation-update: a partial update sends only supplied fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "r1" } } }]);
  await reservationUpdate.execute({
    identifier: "r1",
    notes: "gate code 1234",
    checkin_time: "15:00",
    checkout_time: "11:00",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/r1");
  assertEquals(JSON.parse(calls[0].body!), {
    notes: "gate code 1234",
    checkin_time: "15:00",
    checkout_time: "11:00",
  });
});

Deno.test("reservation-update: a full update on a manual booking nests guests and financials", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await reservationUpdate.execute({
    identifier: "r1",
    check_in: "2026-12-02",
    adults: 3,
    accommodation: 90000,
    currency: "EUR",
    include: "financials",
  }, ctx);
  assertEquals(calls[0].url.endsWith("/v2/reservations/r1?include=financials"), true);
  assertEquals(JSON.parse(calls[0].body!), {
    check_in: "2026-12-02",
    guests: { adults: 3 },
    financials: { accommodation: 90000, currency: "EUR" },
  });
  assertEquals(reservationUpdate.params?.some((p) => p.key === "language"), false);
  assertEquals(requiredOf(reservationUpdate), ["identifier"]);
});
