import { assertEquals } from "@std/assert";
import callReschedule from "../../actions/call-reschedule.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("call-reschedule: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await callReschedule.execute(
    {
      "id": 7,
      "dateTime": "x-dateTime",
      "timeZone": "x-timeZone",
      "rescheduleReason": "x-rescheduleReason",
      "notes": "x-notes",
      "userId": 7,
      "additionalGuests": '[{"email": "g@e.com", "name": "G"}]',
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/eventCalls/reschedule");
  assertEquals(JSON.parse(calls[0].body!), {
    "id": 7,
    "dateTime": "x-dateTime",
    "timeZone": "x-timeZone",
    "rescheduleReason": "x-rescheduleReason",
    "notes": "x-notes",
    "userId": 7,
    "additionalGuests": [{ "email": "g@e.com", "name": "G" }],
  });
  assertEquals(out, REPLY);
});

Deno.test("call-reschedule: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await callReschedule.execute(
    { "id": 7, "dateTime": "x-dateTime", "timeZone": "x-timeZone" } as never,
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    "id": 7,
    "dateTime": "x-dateTime",
    "timeZone": "x-timeZone",
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("call-reschedule: declares a perform action's idempotency", () => {
  assertEquals(callReschedule.type, "perform");
  assertEquals(callReschedule.idempotent, true);
  assertEquals(callReschedule.params!.filter((p) => p.required).map((p) => p.key), [
    "id",
    "dateTime",
    "timeZone",
  ]);
});
