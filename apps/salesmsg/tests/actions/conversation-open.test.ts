import { assert, assertEquals } from "@std/assert";
import conversationOpen from "../../actions/conversation-open.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

Deno.test("conversation-open: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await conversationOpen.execute({ "conversation": 99 }, ctx) as { id: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/conversations/99/open`);
  assertEquals(calls[0].url.includes("?"), false);
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("conversation-open: declares idempotent = true", () => {
  assertEquals(conversationOpen.idempotent, true);
  assertEquals(conversationOpen.type, "perform");
});

Deno.test("conversation-open: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await conversationOpen.execute({ "conversation": 99 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
