import { assertEquals, assertRejects } from "@std/assert";
import bookingCreate from "../../actions/booking-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("booking-create: POST /bookings sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "bookings", "attributes": { "name": "x" } } },
  }]);
  const out = await bookingCreate.execute({
    "personId": 7,
    "startedOn": "2026-10-01",
    "endedOn": "2026-10-01",
    "time": 7,
    "percentage": 7,
    "totalTime": 7,
    "serviceId": 7,
    "eventId": 7,
    "taskId": 7,
    "draft": true,
    "note": "sample note",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/bookings");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "bookings",
      attributes: {
        "person_id": 7,
        "started_on": "2026-10-01",
        "ended_on": "2026-10-01",
        "time": 7,
        "percentage": 7,
        "total_time": 7,
        "service_id": 7,
        "event_id": 7,
        "task_id": 7,
        "draft": true,
        "note": "sample note",
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("booking-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        bookingCreate.execute(
          { "personId": 7, "startedOn": "2026-10-01", "endedOn": "2026-10-01" },
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("booking-create: declares perform and idempotent=false", () => {
  assertEquals(bookingCreate.type, "perform");
  assertEquals(bookingCreate.idempotent, false);
  assertEquals(bookingCreate.key, "booking-create");
});
