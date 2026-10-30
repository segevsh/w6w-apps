import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-unshare-user.ts";

test("recording-unshare-user: DELETEs with user_id as a path segment, no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute({ recordingId: "r1", userId: "u1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/users/u1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, { success: true });
});

test("recording-unshare-user: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
