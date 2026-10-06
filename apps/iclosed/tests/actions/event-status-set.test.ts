import { assertEquals } from "@std/assert";
import eventStatusSet from "../../actions/event-status-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("event-status-set: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await eventStatusSet.execute({ "id": 7, "status": "ACTIVATED" } as never, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/events/status");
  assertEquals(JSON.parse(calls[0].body!), { "id": 7, "status": "ACTIVATED" });
  assertEquals(out, REPLY);
});

Deno.test("event-status-set: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await eventStatusSet.execute({ "id": 7, "status": "ACTIVATED" } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7, "status": "ACTIVATED" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("event-status-set: declares a perform action's idempotency", () => {
  assertEquals(eventStatusSet.type, "perform");
  assertEquals(eventStatusSet.idempotent, true);
  assertEquals(eventStatusSet.params!.filter((p) => p.required).map((p) => p.key), [
    "id",
    "status",
  ]);
});
