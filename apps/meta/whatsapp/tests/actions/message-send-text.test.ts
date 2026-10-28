import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-text.ts";

const OK = { messaging_product: "whatsapp", messages: [{ id: "wamid.1" }] };

Deno.test("message-send-text: POSTs a text message with the recipient and body", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await action.execute({ to: "15551234567", text: "hi there" }, ctx);
  assertEquals(out, OK);
  assertEquals(calls[0].url, "https://graph.facebook.com/v23.0/1234567890/messages");
  assertEquals(JSON.parse(calls[0].body!), {
    messaging_product: "whatsapp",
    to: "15551234567",
    type: "text",
    text: { body: "hi there" },
  });
});

Deno.test("message-send-text: passes preview_url through when set", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ to: "1", text: "see https://example.com", previewUrl: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.text, { body: "see https://example.com", preview_url: true });
});

Deno.test("message-send-text: is a non-idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assert(action.params?.some((p) => p.key === "text" && p.required));
});
