import { assertEquals } from "@std/assert";
import reservationCreate from "../../actions/reservation-create.ts";
import { mockCtx } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("reservation-create: flat fields fold into guests / guest / financials", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "r9" } } }]);
  const out = await reservationCreate.execute({
    property_id: "p1",
    check_in: "2026-12-01",
    check_out: "2026-12-05",
    adults: 2,
    children: 1,
    guest_first_name: "Ann",
    guest_last_name: "Lee",
    guest_email: "ann@example.com",
    guest_phone: "+1555",
    accommodation: 120000,
    currency: "USD",
    cleaning_fee: 5000,
    other_fees: '[{"label":"Towels","amount":1000}]',
    notes: "late arrival",
    language: "en",
    channel: "direct",
    reservation_code: "X1",
    include: "guest",
  }, ctx) as { data: { id: string } };
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://public.api.hospitable.com/v2/reservations?include=guest");
  assertEquals(JSON.parse(calls[0].body!), {
    property_id: "p1",
    check_in: "2026-12-01",
    check_out: "2026-12-05",
    guests: { adults: 2, children: 1 },
    guest: { first_name: "Ann", last_name: "Lee", email: "ann@example.com", phone: "+1555" },
    financials: {
      accommodation: 120000,
      currency: "USD",
      cleaning_fee: 5000,
      other_fees: [{ label: "Towels", amount: 1000 }],
    },
    notes: "late arrival",
    language: "en",
    channel: "direct",
    reservation_code: "X1",
  });
  assertEquals(out.data.id, "r9");
  assertEquals(reservationCreate.idempotent, false);
  assertEquals(requiredOf(reservationCreate), [
    "accommodation",
    "adults",
    "check_in",
    "check_out",
    "currency",
    "guest_email",
    "guest_first_name",
    "guest_last_name",
    "language",
    "property_id",
  ]);
});
