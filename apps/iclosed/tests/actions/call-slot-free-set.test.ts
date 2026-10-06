import { assertEquals } from "@std/assert";
import callSlotFreeSet from "../../actions/call-slot-free-set.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("call-slot-free-set: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await callSlotFreeSet.execute({ "id": 7, "isSlotFree": true } as never, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/eventCalls/markSlotFree");
  assertEquals(JSON.parse(calls[0].body!), { "id": 7, "isSlotFree": true });
  assertEquals(out, REPLY);
});

Deno.test("call-slot-free-set: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await callSlotFreeSet.execute({ "id": 7, "isSlotFree": true } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7, "isSlotFree": true });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("call-slot-free-set: declares a perform action's idempotency", () => {
  assertEquals(callSlotFreeSet.type, "perform");
  assertEquals(callSlotFreeSet.idempotent, true);
  assertEquals(callSlotFreeSet.params!.filter((p) => p.required).map((p) => p.key), [
    "id",
    "isSlotFree",
  ]);
});
