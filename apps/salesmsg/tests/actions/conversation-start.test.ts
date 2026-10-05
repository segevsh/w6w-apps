import { assert, assertEquals } from "@std/assert";
import conversationStart from "../../actions/conversation-start.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("conversation-start: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await conversationStart.execute({ "contact_id": 42 }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/conversations`);
  assertEquals(queryOf(calls[0].url), { "contact_id": "42" });
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("conversation-start: declares idempotent = false", () => {
  assertEquals(conversationStart.idempotent, false);
  assertEquals(conversationStart.type, "perform");
});

Deno.test("conversation-start: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await conversationStart.execute({ "contact_id": 42 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
