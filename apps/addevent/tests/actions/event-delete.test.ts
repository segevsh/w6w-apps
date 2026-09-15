import { assertEquals, assertRejects } from "@std/assert";
import eventDelete from "../../actions/event-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-delete: DELETEs and reports the 204 with no body to parse", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await eventDelete.execute({ eventId: "evt-1" }, ctx) as {
    eventId: string;
    status: number;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events/evt-1");
  assertEquals(out, { eventId: "evt-1", status: 204 });
});

Deno.test("event-delete: a repeat delete on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(eventDelete.execute({ eventId: "evt-1" }, ctx)),
    Error,
  );
});

Deno.test("event-delete: is declared idempotent", () => {
  assertEquals(eventDelete.idempotent, true);
});
