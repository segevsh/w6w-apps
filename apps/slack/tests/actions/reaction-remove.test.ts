import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reaction-remove.ts";

test("reaction-remove: POSTs /reactions.remove with channel, timestamp, name", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await action.execute!({ channel: "C1", timestamp: "1.1", name: "thumbsup" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/reactions.remove");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", timestamp: "1.1", name: "thumbsup" });
});
