import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import messageGet from "../../actions/message-get.ts";

test("message-get: keeps the @ in the session key literal", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "message": { "uuid": "MSG1", "read": true } },
  }]);
  await messageGet.execute!(
    { "sessionKey": "WW-WPN1-5215511112222@c.us", "messageUuid": "MSG1" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/message/WW-WPN1-5215511112222@c.us/MSG1",
  );
  assert.deepStrictEqual(calls[0].body, null);
});
