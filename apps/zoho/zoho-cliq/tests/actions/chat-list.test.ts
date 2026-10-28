import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/chat-list.ts";

Deno.test("chat-list: lists chats with filters", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 200,
    "body": { "chats": [{ "chat_id": "c1" }] },
  }]);
  const out = await action.execute(
    { "limit": 5, "modifiedBefore": 1563162010000, "drafts": false } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "limit": "5",
    "modified_before": "1563162010000",
    "drafts": "false",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "chats": [{ "chat_id": "c1" }] });
});

Deno.test("chat-list: is a read action", () => {
  assertEquals(action.type, "read");
});
