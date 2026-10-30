import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import callStop from "../../actions/call-stop.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("call-stop: posts to /v1/calls/{id}/stop and maps the response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { status: "success", message: "Call ended successfully." },
  }]);
  const out = await callStop.execute({ callId: "c-1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/calls/c-1/stop");
  assertEquals(calls[0].method, "POST");
  assertEquals(out.status, "success");
  assertEquals(out.message, "Call ended successfully.");
});

test("call-stop: is declared idempotent", () => {
  assertEquals(callStop.idempotent, true);
});
