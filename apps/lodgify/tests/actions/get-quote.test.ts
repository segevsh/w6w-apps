import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import getQuote from "../../actions/get-quote.ts";

Deno.test("get-quote: uses the documented indexed roomTypes[0]/addOns[0] query form", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ total_including_vat: 100 }] }]);
  const out = await getQuote.execute({
    propertyId: 5,
    arrival: "2026-08-01",
    departure: "2026-08-05",
    roomTypeId: 6,
    adults: 2,
    pets: 1,
    addOns: [{ id: 9, units: 2 }],
    promotionCode: "SUMMER",
  }, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/quote/5");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("roomTypes[0].Id"), "6");
  assertEquals(q.get("roomTypes[0].guest_breakdown.adults"), "2");
  assertEquals(q.get("roomTypes[0].guest_breakdown.pets"), "1");
  assertEquals(q.get("addOns[0].Id"), "9");
  assertEquals(q.get("addOns[0].Units"), "2");
  assertEquals(q.get("promotionCode"), "SUMMER");
  assertEquals(q.get("arrival"), "2026-08-01");
  assertEquals(q.has("roomTypes[0].People"), false, "deprecated People must not be sent");
  assertEquals(out.items.length, 1);
});

Deno.test("get-quote: dates and a room type are required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(getQuote.execute({ propertyId: 5, roomTypeId: 6 }, ctx)),
    Error,
    "arrival",
  );
  assertEquals(calls.length, 0);
});
