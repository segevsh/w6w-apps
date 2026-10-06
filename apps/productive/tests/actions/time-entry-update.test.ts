import { assertEquals, assertRejects } from "@std/assert";
import timeEntryUpdate from "../../actions/time-entry-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-entry-update: PATCH /time_entries/{id} sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "time_entries", "attributes": { "name": "x" } } },
  }]);
  const out = await timeEntryUpdate.execute({
    "id": "42",
    "personId": 7,
    "serviceId": 7,
    "date": "2026-10-01",
    "time": 7,
    "note": "sample note",
    "taskId": 7,
    "startedAt": "2026-10-01T09:00:00Z",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/time_entries/42");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: {
      type: "time_entries",
      attributes: {
        "person_id": 7,
        "service_id": 7,
        "date": "2026-10-01",
        "time": 7,
        "note": "sample note",
        "task_id": 7,
        "started_at": "2026-10-01T09:00:00Z",
      },
    },
  });
  assertEquals((out as Record<string, unknown>).id, "42");
});

Deno.test("time-entry-update: only the fields set are sent", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "time_entries", "attributes": { "name": "x" } } },
  }]);
  await timeEntryUpdate.execute({ id: "42", personId: 7 }, ctx);
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    data: { type: "time_entries", attributes: { "person_id": 7 } },
  });
});

Deno.test("time-entry-update: naming no field to change fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(timeEntryUpdate.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("at least one field"), true, err.message);
  assertEquals(calls.length, 0);
});

Deno.test("time-entry-update: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("404", "not_found", "Not Found", "Resource not found"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(timeEntryUpdate.execute({ id: "42", personId: 7 }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Resource not found"), true, err.message);
});

Deno.test("time-entry-update: declares perform and idempotent=true", () => {
  assertEquals(timeEntryUpdate.type, "perform");
  assertEquals(timeEntryUpdate.idempotent, true);
  assertEquals(timeEntryUpdate.key, "time-entry-update");
});
