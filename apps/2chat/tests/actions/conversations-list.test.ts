import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import conversationsList from "../../actions/conversations-list.ts";

test("conversations-list: passes the number filter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "total": 0, "sessions": [] } }]);
  await conversationsList.execute!(
    { "channelUuid": "WPN1", "phoneNumber": "123456" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/conversations/WPN1?phone_number=123456&page_number=0",
  );
  assert.deepStrictEqual(calls[0].body, null);
});
