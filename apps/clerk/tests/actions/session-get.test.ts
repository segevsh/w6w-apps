import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/session-get.ts";

test("session-get: hits GET /sessions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "sess_1" } }]);
  await action.execute!({ sessionId: "sess_1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/sessions/sess_1");
});
