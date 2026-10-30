import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import wabaConversationWindowGet from "../../actions/waba-conversation-window-get.ts";

test("waba-conversation-window-get: reads the window", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "success": true,
      "window_open": true,
      "seconds_left": 61234,
      "allowed_message_types": ["free_form", "template"],
    },
  }]);
  const out = await wabaConversationWindowGet.execute!(
    { "fromNumber": "+15550001111", "toNumber": "+15552223333" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/waba/conversation-window/+15550001111/+15552223333",
  );
  assert.deepStrictEqual(calls[0].body, null);
  assert.deepStrictEqual((out as { window_open: boolean }).window_open, true);
});
