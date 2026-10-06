import { assertEquals, assertRejects } from "@std/assert";
import bookingCheckin from "../../actions/booking-checkin.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("booking-checkin: PUT /api/external/v1/companies/bodyglove/bookings/b-1/checkin/", async () => {
  const body = { booking: { uuid: "b-1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingCheckin.execute({
      shortname: "bodyglove",
      bookingUuid: "b-1",
      customerPk: 12,
      checkinStatus: "31",
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/bookings/b-1/checkin/");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { customer: 12, checkin_status: 31 });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-checkin: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingCheckin.execute({
        shortname: "bodyglove",
        bookingUuid: "b-1",
        customerPk: 12,
        checkinStatus: "31",
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-checkin: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingCheckin.execute({
        ...{ shortname: "bodyglove", bookingUuid: "b-1", customerPk: 12, checkinStatus: "31" },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
