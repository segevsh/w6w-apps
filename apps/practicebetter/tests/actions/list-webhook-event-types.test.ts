import { assertEquals } from "@std/assert";
import action from "../../actions/list-webhook-event-types.ts";
import { API_ROOT, mockCtx, urlOf } from "../_helpers.ts";

const groups = [
  { name: "Clients", eventTypes: [{ label: "Client created", value: "client.created" }] },
  { name: "Sessions", eventTypes: [{ label: "Session booked", value: "session.created" }] },
];

Deno.test("list-webhook-event-types: reads /webhooks/subscription/event/types", async () => {
  const { ctx, calls } = mockCtx([{ body: groups }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/webhooks/subscription/event/types`);
  assertEquals(result, groups);
});

Deno.test("list-webhook-event-types: the bare array is returned verbatim", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params, []);
  assertEquals((action.output as unknown[]).length, 1);
  assertEquals((action.output as Array<{ key: string; type: string }>)[0].type, "array");
  assertEquals((action.output as Array<{ key: string }>)[0].key, "[]");
});

Deno.test("list-webhook-event-types: a non-array body yields an empty list, never a crash", async () => {
  const { ctx } = mockCtx([{ body: { unexpected: true } }]);
  assertEquals(await action.execute({}, ctx), []);
});
