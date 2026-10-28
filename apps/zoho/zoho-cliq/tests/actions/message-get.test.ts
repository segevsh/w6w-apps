import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/message-get.ts";

Deno.test("message-get: gets one message", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "id": "1543320941513_23291239955324", "type": "text" },
  }]);
  const out = await action.execute(
    { "chatId": "CT_1", "messageId": "1543320941513_23291239955324" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/messages/1543320941513_23291239955324");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "message": { "id": "1543320941513_23291239955324", "type": "text" },
  });
});

Deno.test("message-get: encodes a message id that contains a space", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "id": "x" } }]);
  const out = await action.execute(
    { "chatId": "CT_1", "messageId": "1645632094118 223997917594" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/messages/1645632094118%20223997917594");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "message": { "id": "x" } });
});

Deno.test("message-get: is a read action", () => {
  assertEquals(action.type, "read");
});
