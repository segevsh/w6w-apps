import { assert, assertEquals } from "@std/assert";
import conversationAssign from "../../actions/conversation-assign.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("conversation-assign: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await conversationAssign.execute({ "conversation": 99, "user_id": 3 }, ctx) as {
    id: number;
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/conversations/99/reassign`);
  assertEquals(queryOf(calls[0].url), { "user_id": "3" });
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("conversation-assign: declares idempotent = true", () => {
  assertEquals(conversationAssign.idempotent, true);
  assertEquals(conversationAssign.type, "perform");
});

Deno.test("conversation-assign: a blank user sends no user_id, which unassigns", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 99 } }]);
  await conversationAssign.execute({ conversation: 99 }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("conversation-assign: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await conversationAssign.execute({ "conversation": 99, "user_id": 3 }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
