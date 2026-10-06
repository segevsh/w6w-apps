import { assertEquals } from "@std/assert";
import eventCancel from "../../actions/event-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-cancel: POST /v1/events/{id}/cancel with cancel_reason", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", state: "canceled" } }]);
  const out = await eventCancel.execute({ eventId: "e1", cancelReason: "conflict" }, ctx) as {
    state: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/events/e1/cancel");
  assertEquals(JSON.parse(calls[0].body!), { cancel_reason: "conflict" });
  assertEquals(out.state, "canceled");
});

Deno.test("event-cancel: reason is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventCancel.execute({ eventId: "e1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});
