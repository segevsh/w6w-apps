import { assertEquals } from "@std/assert";
import action from "../../actions/cancel-session.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

Deno.test("cancel-session: POSTs to /consultant/sessions/{sessionId}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const result = await action.execute({
    sessionId: "sess-1",
    notify: true,
    notes: "rescheduling",
    cancelPendingBookings: true,
    cancelRecurringAutomations: false,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/sessions/sess-1/cancel`);
  const body = bodyOf(calls[0]);
  assertEquals(body.notify, true);
  assertEquals(body.notes, "rescheduling");
  assertEquals(body.cancelPendingBookings, true);
  // An explicit `false` is meaningful and must survive.
  assertEquals(body.cancelRecurringAutomations, false);
  assertEquals(result, { status: 200 });
});

Deno.test("cancel-session: an empty body is valid — every field is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({ sessionId: "sess-1" }, ctx);
  assertEquals(calls[0].body, "{}");
  assertEquals(action.params!.every((p) => p.key === "sessionId" || p.required !== true), true);
});

Deno.test("cancel-session: reports the status and is retry-safe in end state", () => {
  assertEquals(action.idempotent, true);
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), ["status"]);
  assertEquals(action.type, "perform");
});
