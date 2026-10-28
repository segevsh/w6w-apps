import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event.ts";

Deno.test("create-event: POSTs the event to the default calendar", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "e1", subject: "Sync" } }]);
  const out = await action.execute({
    subject: "Sync",
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
    timeZone: "Pacific Standard Time",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/events");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Sync");
  assertEquals(body.start, {
    dateTime: "2026-08-15T12:00:00",
    timeZone: "Pacific Standard Time",
  });
  assertEquals((out as { id: string }).id, "e1");
});

Deno.test("create-event: posts to a named calendar when given one", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    calendarId: "cal-1",
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars/cal-1/events");
});

Deno.test("create-event: stamps the invocation id as transactionId for dedupe", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const withInvocation = {
    ...ctx,
    invocation: { invocationId: "inv-42" },
  } as unknown as HookContext;

  await action.execute({
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
  }, withInvocation);

  assertEquals(JSON.parse(calls[0].body!).transactionId, "inv-42");
});

Deno.test("create-event: an explicit transactionId wins over the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  const withInvocation = {
    ...ctx,
    invocation: { invocationId: "inv-42" },
  } as unknown as HookContext;

  await action.execute({
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
    transactionId: "mine",
  }, withInvocation);

  assertEquals(JSON.parse(calls[0].body!).transactionId, "mine");
});

Deno.test("create-event: omits transactionId when there is no invocation context", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).transactionId, undefined);
});

Deno.test("create-event: sends attendees with their Graph types", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute({
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
    requiredAttendees: ["a@x.com"],
    resourceAttendees: ["room@x.com"],
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!).attendees, [
    { type: "required", emailAddress: { address: "a@x.com" } },
    { type: "resource", emailAddress: { address: "room@x.com" } },
  ]);
});

Deno.test("create-event: is the one idempotent create, because Graph supports transactionId", () => {
  assertEquals(action.idempotent, true);
  assert(action.params?.some((p) => p.key === "transactionId"));
});
