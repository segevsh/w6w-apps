import { assertEquals } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/message-delete.ts";

Deno.test("message-delete: deletes (204)", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 204 }]);
  const out = await action.execute({ "chatId": "CT_1", "messageId": "m1" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/chats/CT_1/messages/m1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "success": true });
});

Deno.test("message-delete: idempotent is declared as true", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
