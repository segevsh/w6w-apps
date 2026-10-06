import { assertEquals } from "@std/assert";
import reservationGet from "../../actions/reservation-get.ts";
import { mockCtx } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("reservation-get: UUID or code in the path, include in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "r1" } } }]);
  await reservationGet.execute({ identifier: "HM 1/2", include: "guest" }, ctx);
  assertEquals(
    calls[0].url,
    "https://public.api.hospitable.com/v2/reservations/HM%201%2F2?include=guest",
  );
  assertEquals(requiredOf(reservationGet), ["identifier"]);
});
