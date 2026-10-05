import { assert, assertEquals } from "@std/assert";
import conversationClose from "../../actions/conversation-close.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("conversation-close: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await conversationClose.execute({ "conversation": 99 }, ctx) as { id: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/conversations/99/close`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("conversation-close: declares idempotent = true", () => {
  assertEquals(conversationClose.idempotent, true);
  assertEquals(conversationClose.type, "perform");
});

Deno.test("conversation-close: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await conversationClose.execute({ "conversation": 99 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
