import { assertEquals, assertRejects } from "@std/assert";
import timeEntryCreate from "../../actions/time-entry-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("time-entry-create: POST /time_entries sends a JSON:API document of attributes", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "data": { "id": "42", "type": "time_entries", "attributes": { "name": "x" } } },
  }]);
  const out = await timeEntryCreate.execute({
    "personId": 7,
    "serviceId": 7,
    "date": "2026-10-01",
    "time": 7,
    "note": "sample note",
    "taskId": 7,
    "startedAt": "2026-10-01T09:00:00Z",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/time_entries");
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

Deno.test("time-entry-create: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timeEntryCreate.execute(
          { "personId": 7, "serviceId": 7, "date": "2026-10-01", "time": 7 },
          ctx,
        ),
      ),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("time-entry-create: declares perform and idempotent=false", () => {
  assertEquals(timeEntryCreate.type, "perform");
  assertEquals(timeEntryCreate.idempotent, false);
  assertEquals(timeEntryCreate.key, "time-entry-create");
});
