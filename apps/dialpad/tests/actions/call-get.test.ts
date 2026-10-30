import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import callGet from "../../actions/call-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("call-get: GETs /call/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "99", state: "hangup" } }]);
  const out = await callGet.execute({ callId: "99" }, ctx) as { call_id: string };
  assertEquals(pathOf(calls[0].url), "/api/v2/call/99");
  assertEquals(out.call_id, "99");
});

test("call-get: declared as a read action", () => {
  assertEquals(callGet.type, "read");
});
