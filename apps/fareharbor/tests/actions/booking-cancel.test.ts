import { assertEquals, assertRejects } from "@std/assert";
import bookingCancel from "../../actions/booking-cancel.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("booking-cancel: DELETE /api/external/v1/companies/bodyglove/bookings/b-1/", async () => {
  const body = { booking: { uuid: "b-1", status: "cancelled" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingCancel.execute({ shortname: "bodyglove", bookingUuid: "b-1" }, ctx),
    body,
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/bookings/b-1/");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-cancel: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () => await bookingCancel.execute({ shortname: "bodyglove", bookingUuid: "b-1" }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-cancel: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingCancel.execute({
        ...{ shortname: "bodyglove", bookingUuid: "b-1" },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
