import { assertEquals, assertRejects } from "@std/assert";
import bookingNoteUpdate from "../../actions/booking-note-update.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("booking-note-update: PUT /api/external/v1/companies/bodyglove/bookings/b-1/note/", async () => {
  const body = { booking: { uuid: "b-1", note: "VIP" } };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(
    await bookingNoteUpdate.execute(
      { shortname: "bodyglove", bookingUuid: "b-1", note: "VIP" },
      ctx,
    ),
    body,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/external/v1/companies/bodyglove/bookings/b-1/note/");
  assertEquals(JSON.parse(calls[0].body ?? "null"), { note: "VIP" });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-fareharbor-api-app"], undefined);
});

Deno.test("booking-note-update: a vendor error surfaces its code and sentence", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody(404, "company-shortname-invalid", "nope is not a valid company shortname"),
  }]);
  await assertRejects(
    async () =>
      await bookingNoteUpdate.execute(
        { shortname: "bodyglove", bookingUuid: "b-1", note: "VIP" },
        ctx,
      ),
    Error,
    "FareHarbor 404 company-shortname-invalid: nope is not a valid company shortname",
  );
});

Deno.test("booking-note-update: refuses an empty shortname before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await bookingNoteUpdate.execute({
        ...{ shortname: "bodyglove", bookingUuid: "b-1", note: "VIP" },
        shortname: " ",
      }, ctx),
    Error,
    "shortname is required",
  );
  assertEquals(calls.length, 0);
});
