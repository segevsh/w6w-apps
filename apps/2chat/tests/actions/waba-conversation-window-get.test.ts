import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import wabaConversationWindowGet from "../../actions/waba-conversation-window-get.ts";

Deno.test("waba-conversation-window-get: reads the window", async () => {
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
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/waba/conversation-window/+15550001111/+15552223333",
  );
  assertEquals(calls[0].body, null);
  assertEquals((out as { window_open: boolean }).window_open, true);
});
