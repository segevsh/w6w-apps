import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import conversationsList from "../../actions/conversations-list.ts";

Deno.test("conversations-list: passes the number filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "total": 0, "sessions": [] } }]);
  await conversationsList.execute!(
    { "channelUuid": "WPN1", "phoneNumber": "123456" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/conversations/WPN1?phone_number=123456&page_number=0",
  );
  assertEquals(calls[0].body, null);
});
