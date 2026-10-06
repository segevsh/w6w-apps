import { assertEquals, assertRejects } from "@std/assert";
import bookingListByCreateDate from "../../actions/booking-list-by-create-date.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("booking-list-by-create-date: GET /api/external/v1/companies/bodyglove/minimal/bookings-by-create-date/2026-11-02/", async () => {
  const body = { bookings: [{ pk: 5, status: "booked" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingListByCreateDate.execute({ shortname: "bodyglove", date: "2026-11-02" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/minimal/bookings-by-create-date/2026-11-02/",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-list-by-create-date: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingListByCreateDate.execute({ shortname: "bodyglove", date: "2026-11-02" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-list-by-create-date: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingListByCreateDate.execute({
        ...{ shortname: "bodyglove", date: "2026-11-02" },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
