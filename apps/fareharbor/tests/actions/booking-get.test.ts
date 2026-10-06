import { assertEquals, assertRejects } from "@std/assert";
import bookingGet from "../../actions/booking-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("booking-get: GET /api/external/v1/companies/bodyglove/bookings/b-1/", async () => {
  const body = { booking: { uuid: "b-1", status: "booked" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingGet.execute(
      { shortname: "bodyglove", bookingUuid: "b-1", withPayments: true },
      ctx,
    ),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/bookings/b-1/");
  assertEquals(queryOf(calls[0].url), { with_payments: "yes" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-get: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingGet.execute(
        { shortname: "bodyglove", bookingUuid: "b-1", withPayments: true },
        ctx,
      ),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-get: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingGet.execute({
        ...{ shortname: "bodyglove", bookingUuid: "b-1", withPayments: true },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
