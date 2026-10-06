import { assertEquals, assertRejects } from "@std/assert";
import bookingCreate from "../../actions/booking-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("booking-create: POST /api/external/v1/companies/bodyglove/availabilities/99/bookings/", async () => {
  const body = { booking: { uuid: "b-2" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingCreate.execute({
      shortname: "bodyglove",
      availabilityPk: 99,
      contact: '{"name":"A","phone":"1","email":"a@x.com"}',
      customers: [{ customer_type_rate: 5 }],
      lodging: 3,
      amountPaid: 0,
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(
    pathOf(calls[0].url),
    "/api/external/v1/companies/bodyglove/availabilities/99/bookings/",
  );
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    contact: { name: "A", phone: "1", email: "a@x.com" },
    customers: [{ customer_type_rate: 5 }],
    lodging: 3,
    amount_paid: 0,
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-create: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingCreate.execute({
        shortname: "bodyglove",
        availabilityPk: 99,
        contact: '{"name":"A","phone":"1","email":"a@x.com"}',
        customers: [{ customer_type_rate: 5 }],
        lodging: 3,
        amountPaid: 0,
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-create: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingCreate.execute({
        ...{
          shortname: "bodyglove",
          availabilityPk: 99,
          contact: '{"name":"A","phone":"1","email":"a@x.com"}',
          customers: [{ customer_type_rate: 5 }],
          lodging: 3,
          amountPaid: 0,
        },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("booking-create: optional JSON fields are omitted and bad JSON is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { booking: {} } }]);
  await bookingCreate.execute({
    shortname: "bodyglove",
    availabilityPk: "99",
    contact: { name: "A" },
    customers: "[]",
    customFieldValues: '[{"custom_field":1,"value":true}]',
    rebooking: "old-uuid",
    voucherNumber: "V1",
    externalId: "E1",
    note: "n",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    contact: { name: "A" },
    customers: [],
    custom_field_values: [{ custom_field: 1, value: true }],
    note: "n",
    voucher_number: "V1",
    external_id: "E1",
    rebooking: "old-uuid",
  });
  const bad = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingCreate.execute(
        { shortname: "s", availabilityPk: 1, contact: "{", customers: [] },
        bad.ctx,
      ),
    Error,
    "contact is not valid JSON",
  );
  await assertRejects(
    async () =>
      await bookingCreate.execute(
        { shortname: "s", availabilityPk: "9/../1", contact: {}, customers: [] },
        bad.ctx,
      ),
    Error,
    "numeric",
  );
  assertEquals(bad.calls.length, 0);
});
