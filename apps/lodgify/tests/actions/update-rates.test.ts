import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import updateRates from "../../actions/update-rates.ts";

Deno.test("update-rates: POSTs property_id, room_type_id and the rates as written", async () => {
  const { ctx, calls } = mockCtx([{ body: true }]);
  const rates = [{ is_default: false, start_date: "2026-12-20", price_per_day: 180 }];
  const out = await updateRates.execute({
    propertyId: 5,
    roomTypeId: 6,
    rates: JSON.stringify(rates),
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/rates/savewithoutavailability");
  assertEquals(JSON.parse(calls[0].body!), { property_id: 5, room_type_id: 6, rates });
  assertEquals(out, { ok: true });
});

Deno.test("update-rates: a `false` answer is an error, and bad JSON is refused before any call", async () => {
  const { ctx, calls } = mockCtx([{ body: false }]);
  await assertRejects(
    () =>
      Promise.resolve(
        updateRates.execute({ propertyId: 1, roomTypeId: 2, rates: [{ a: 1 }] }, ctx),
      ),
    Error,
    "did not save",
  );
  await assertRejects(
    () =>
      Promise.resolve(updateRates.execute({ propertyId: 1, roomTypeId: 2, rates: "{nope" }, ctx)),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 1);
});
