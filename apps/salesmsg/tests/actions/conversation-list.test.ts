import { assert, assertEquals } from "@std/assert";
import conversationList from "../../actions/conversation-list.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("conversation-list: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const result = await conversationList.execute({ "filter": "open", "limit": 25 }, ctx) as {
    items: unknown[];
    meta?: Record<string, unknown>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/conversations`);
  assertEquals(queryOf(calls[0].url), { "filter": "open", "limit": "25" });
  assertEquals(calls[0].body, null);
  assertEquals(result.items.length, 2);
});

Deno.test("conversation-list: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await conversationList.execute({ "filter": "open", "limit": 25 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
