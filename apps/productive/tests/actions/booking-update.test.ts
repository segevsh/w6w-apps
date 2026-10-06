import { assertEquals, assertRejects } from "@std/assert";
import bookingUpdate from "../../actions/booking-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("booking-update: PATCH /bookings/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "bookings", "attributes": { "name": "x" } } },
  }]);
  const out = await bookingUpdate.execute({
    "id": "42",
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
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/bookings/42");
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

Deno.test("booking-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "bookings", "attributes": { "name": "x" } } },
  }]);
  await bookingUpdate.execute({ id: "42", personId: 7 }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "bookings", attributes: { "person_id": 7 } },
  });
});

Deno.test("booking-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(bookingUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("booking-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(bookingUpdate.execute({ id: "42", personId: 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("booking-update: declares perform and idempotent=true", () => {
  assertEquals(bookingUpdate.type, "perform");
  assertEquals(bookingUpdate.idempotent, true);
  assertEquals(bookingUpdate.key, "booking-update");
});
