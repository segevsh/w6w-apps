import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-chat-action.ts";

Deno.test("message-send-chat-action: POSTs sendChatAction", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true, result: true } }]);
  assertEquals(await action.execute({ chatId: "1", action: "typing" }, ctx), true);
  assertEquals(JSON.parse(calls[0].body!), { chat_id: "1", action: "typing" });
});

Deno.test("message-send-chat-action: offers the Bot API's documented action list", () => {
  const opts = action.params?.find((p) => p.key === "action")?.options;
  assert(Array.isArray(opts));
  const values = opts.map((o) => o.value);
  assert(values.includes("typing"));
  assert(values.includes("upload_photo"));
  assert(values.includes("choose_sticker"));
});
