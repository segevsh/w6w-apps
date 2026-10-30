import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import messageDelete from "../../actions/message-delete.ts";

test("message-delete: deletes by session key and uuid", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "message_uuid": "MSG1", "whatsapp_message_id": "3EB0" },
  }]);
  await messageDelete.execute!(
    { "sessionKey": "WW-WPN1-1@g.us", "messageUuid": "MSG1" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "DELETE");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/message/WW-WPN1-1@g.us/MSG1");
  assert.deepStrictEqual(calls[0].body, null);
});
