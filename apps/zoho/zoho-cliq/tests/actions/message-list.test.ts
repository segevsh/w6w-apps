import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/message-list.ts";

Deno.test("message-list: lists messages in a window", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "data": [{ "id": "m1" }] } }]);
  const out = await action.execute(
    { "chatId": "CT_1", "fromTime": 1, "toTime": 2, "limit": 4 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/messages");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "fromtime": "1",
    "totime": "2",
    "limit": "4",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "messages": [{ "id": "m1" }] });
});

Deno.test("message-list: is a read action", () => {
  assertEquals(action.type, "read");
});
