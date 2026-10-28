import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-event.ts";

Deno.test("get-event: GETs the event by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", subject: "Sync" } }]);
  const out = await action.execute({ eventId: "e1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/events/e1");
  assertEquals(calls[0].method, "GET");
  assertEquals((out as { subject: string }).subject, "Sync");
});

Deno.test("get-event: uses the per-calendar path when scoped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ eventId: "e1", calendarId: "cal-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars/cal-1/events/e1");
});

Deno.test("get-event: forwards $select and the Prefer headers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    eventId: "e1",
    select: ["subject", "start"],
    timeZone: "UTC",
    bodyContentType: "text",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "subject,start");
  assertEquals(
    calls[0].headers["prefer"],
    'outlook.body-content-type="text", outlook.timezone="UTC"',
  );
});
