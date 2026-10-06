import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messageGet from "../../actions/message-get.ts";

Deno.test("message-get: keeps the @ in the session key literal", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "message": { "uuid": "MSG1", "read": true } },
  }]);
  await messageGet.execute!(
    { "sessionKey": "WW-WPN1-5215511112222@c.us", "messageUuid": "MSG1" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/message/WW-WPN1-5215511112222@c.us/MSG1",
  );
  assertEquals(calls[0].body, null);
});
