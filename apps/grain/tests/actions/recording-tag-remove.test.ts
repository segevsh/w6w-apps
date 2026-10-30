import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-tag-remove.ts";

test("recording-tag-remove: DELETEs with the tag as a path segment, no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute({ recordingId: "r1", tag: "my-new-tag" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/tags/my-new-tag");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(result, { success: true });
});

test("recording-tag-remove: URL-encodes the tag", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ recordingId: "r1", tag: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/_/public-api/v2/recordings/r1/tags/a%20b");
});

test("recording-tag-remove: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
