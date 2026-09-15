import { assertEquals, assertRejects } from "@std/assert";
import eventUpdate from "../../actions/event-update.ts";
import { mockCtx, pathOf, validationErrorBody } from "../_helpers.ts";

Deno.test("event-update: PATCHes only the fields provided, keyed off the id in the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "evt-1", title: "New title" } }]);

  const out = await eventUpdate.execute({ eventId: "evt-1", title: "New title" }, ctx) as {
    id: string;
    title: string;
  };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events/evt-1");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent, { title: "New title" });
  assertEquals(out.title, "New title");
});

Deno.test("event-update: a 400 validation error surfaces the field-level reasons", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: validationErrorBody([{ name: "rrule", reason: "Not a valid RRule" }]) },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(eventUpdate.execute({ eventId: "evt-1", recurringRule: "bad" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("rrule: Not a valid RRule"), true, err.message);
});

Deno.test("event-update: is declared idempotent — a PATCH re-applying the same fields is safe to retry", () => {
  assertEquals(eventUpdate.idempotent, true);
});
