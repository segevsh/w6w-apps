import { assertEquals, assertRejects } from "@std/assert";
import bookingValidate from "../../actions/booking-validate.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("booking-validate: POST /api/external/v1/companies/bodyglove/availabilities/99/bookings/validate/", async () => {
  const body = { is_bookable: true, invoice_price: 8000 };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingValidate.execute({
      shortname: "bodyglove",
      availabilityPk: 99,
      contact: { name: "A", phone: "1", email: "a@x.com" },
      customers: [{ customer_type_rate: 5 }],
      note: "hi",
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/availabilities/99/bookings/validate/",
  );
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    contact: { name: "A", phone: "1", email: "a@x.com" },
    customers: [{ customer_type_rate: 5 }],
    note: "hi",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-validate: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingValidate.execute({
        shortname: "bodyglove",
        availabilityPk: 99,
        contact: { name: "A", phone: "1", email: "a@x.com" },
        customers: [{ customer_type_rate: 5 }],
        note: "hi",
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-validate: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingValidate.execute({
        ...{
          shortname: "bodyglove",
          availabilityPk: 99,
          contact: { name: "A", phone: "1", email: "a@x.com" },
          customers: [{ customer_type_rate: 5 }],
          note: "hi",
        },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
