import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-mutation-status.ts";

test("get-mutation-status: GETs /mutationStatus/{requestId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { completed: true } }]);
  const out = await action.execute({ requestId: "req-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/mutationStatus/req-1");
  assertEquals(out.completed, true);
});
