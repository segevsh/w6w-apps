import { assertEquals, assertRejects } from "@std/assert";
import bookingResendConfirmation from "../../actions/booking-resend-confirmation.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("booking-resend-confirmation: POST /api/external/v1/bookings/resend-confirmation-email/", async () => {
  const body = { message: "ok" };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingResendConfirmation.execute({
      email: "a@x.com",
      dateFrom: "2026-11-02",
      dateTo: "2026-11-03T00:00:00Z",
    }, ctx),
    body,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/bookings/resend-confirmation-email/");
  assertEquals(JSON.parse(calls[0].body ?? "null"), {
    email: "a@x.com",
    date_from: "2026-11-02",
    date_to: "2026-11-03",
  });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-resend-confirmation: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingResendConfirmation.execute({
        email: "a@x.com",
        dateFrom: "2026-11-02",
        dateTo: "2026-11-03T00:00:00Z",
      }, ctx),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});
