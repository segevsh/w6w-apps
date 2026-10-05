import { assert, assertEquals } from "@std/assert";
import messageSendToConversation from "../../actions/message-send-to-conversation.ts";
import { API_ROOT, mockCtx, queryOf, unauthorized } from "../_helpers.ts";

Deno.test("message-send-to-conversation: sends the documented request and returns the answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, ok: true } }]);
  const result = await messageSendToConversation.execute({
    "conversation": 99,
    "message": "Hello",
    "media_urls": "https://x.test/a.png,https://x.test/b.png",
    "enable_quiet_hours": true,
  }, ctx) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/messages/99`);
  const query = queryOf(calls[0].url);
  delete query["media_url[][url]"]; // repeated key, asserted in its own test
  assertEquals(query, { "message": "Hello", "enable_quiet_hours": "true" });
  assertEquals(calls[0].body, null);
  assertEquals(result.id, 1);
});

Deno.test("message-send-to-conversation: repeats media_url[][url] once per URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await messageSendToConversation.execute({
    "conversation": 99,
    "message": "Hello",
    "media_urls": "https://x.test/a.png,https://x.test/b.png",
    "enable_quiet_hours": true,
  }, ctx);
  const urls = new URL(calls[0].url).searchParams.getAll("media_url[][url]");
  assertEquals(urls, ["https://x.test/a.png", "https://x.test/b.png"]);
});

Deno.test("message-send-to-conversation: is not idempotent — a retry would text a person twice", () => {
  assertEquals(messageSendToConversation.idempotent, false);
});

Deno.test("message-send-to-conversation: omits media when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await messageSendToConversation.execute({
    "conversation": 99,
    "message": "Hello",
    "enable_quiet_hours": true,
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("media_url[][url]"), false);
});

Deno.test("message-send-to-conversation: a refused token surfaces the vendor message", async () => {
  const { ctx } = mockCtx([unauthorized()]);
  let message = "";
  try {
    await messageSendToConversation.execute({
      "conversation": 99,
      "message": "Hello",
      "media_urls": "https://x.test/a.png,https://x.test/b.png",
      "enable_quiet_hours": true,
    }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(message.includes("401"), message);
  assert(message.includes("Unauthorized"), message);
});
