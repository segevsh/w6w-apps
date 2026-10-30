import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import updateConversationState from "../../actions/update-conversation-state.ts";

test("update-conversation-state: PATCHes {state} to /conversation/{session_id}/state", async () => {
  const { ctx, calls } = mockCtx([
    { body: { error: false, reason: "updated", data: {} } },
  ], "site_1");
  const result = await updateConversationState.execute(
    { sessionId: "session_x", state: "resolved" },
    ctx,
  );
  assertEquals(result, {});
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { state: "resolved" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/website/site_1/conversation/session_x/state");
});

test("update-conversation-state: marked idempotent — setting the same state twice is a no-op", () => {
  assertEquals(updateConversationState.idempotent, true);
});
