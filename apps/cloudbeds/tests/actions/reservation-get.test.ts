import { assertEquals } from "@std/assert";
import reservationGet from "../../actions/reservation-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("reservation-get: GET /getReservation by reservationID", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ reservationID: "res1", status: "confirmed" }),
  }]);
  const result = await reservationGet.execute({ reservationID: "res1" }, ctx) as { data: unknown };
  assertEquals(pathOf(calls[0].url), "/api/v1.3/getReservation");
  assertEquals(queryOf(calls[0].url), { reservationID: "res1" });
  assertEquals(result.data, { reservationID: "res1", status: "confirmed" });
});

Deno.test("reservation-get: reservationID is declared required", () => {
  const param = reservationGet.params!.find((p) => p.key === "reservationID");
  assertEquals(param?.required, true);
});
