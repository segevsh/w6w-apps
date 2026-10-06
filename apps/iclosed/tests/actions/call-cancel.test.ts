import { assertEquals } from "@std/assert";
import callCancel from "../../actions/call-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("call-cancel: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await callCancel.execute({ "id": 7, "cancelReason": "x-cancelReason" } as never, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/eventCalls/cancel");
  assertEquals(JSON.parse(calls[0].body!), { "id": 7, "cancelReason": "x-cancelReason" });
  assertEquals(out, REPLY);
});

Deno.test("call-cancel: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await callCancel.execute({ "id": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "id": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("call-cancel: declares a perform action's idempotency", () => {
  assertEquals(callCancel.type, "perform");
  assertEquals(callCancel.idempotent, true);
  assertEquals(callCancel.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
