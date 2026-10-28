import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-event.ts";

Deno.test("delete-event: DELETEs the event and reports 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await action.execute({ eventId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/events/e1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { status: 204 });
});

Deno.test("delete-event: uses the per-calendar path when scoped", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await action.execute({ eventId: "e1", calendarId: "cal-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars/cal-1/events/e1");
});

Deno.test("delete-event: warns in its description that attendees get a cancellation", () => {
  assertEquals(action.idempotent, true);
  assertEquals(action.description?.includes("cancellation"), true);
});
