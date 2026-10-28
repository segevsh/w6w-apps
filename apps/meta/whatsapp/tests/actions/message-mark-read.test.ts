import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-mark-read.ts";

Deno.test("message-mark-read: POSTs a status=read envelope for the given message id", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await action.execute({ messageId: "wamid.HBgLM" }, ctx);
  assertEquals(out, { success: true });
  assertEquals(JSON.parse(calls[0].body!), {
    messaging_product: "whatsapp",
    status: "read",
    message_id: "wamid.HBgLM",
  });
});

Deno.test("message-mark-read: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
