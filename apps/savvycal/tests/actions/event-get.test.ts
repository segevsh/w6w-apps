import { assertEquals } from "@std/assert";
import eventGet from "../../actions/event-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-get: GET /v1/events/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "event_1", state: "confirmed" } }]);
  const out = await eventGet.execute({ eventId: " event_1 " }, ctx) as { state: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/events/event_1");
  assertEquals(out.state, "confirmed");
});

Deno.test("event-get: carries no Authorization header (sign adds it)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await eventGet.execute({ eventId: "e" }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
