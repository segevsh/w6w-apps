import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-delete.ts";

test("recording-delete: defaults to the recoverable trash action", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ meetingId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).searchParams.get("action"), "trash");
});

test("recording-delete: permanent deletion is opt-in", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ meetingId: "1", action: "delete" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("action"), "delete");
});
