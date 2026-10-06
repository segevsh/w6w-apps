import { assertEquals, assertThrows } from "@std/assert";
import rcsSend, { buildContent } from "../../actions/rcs-send.ts";
import { bodyOf, envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rcs-send: text message with SMS fallback", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1" }) }]);
  const out = await rcsSend.execute({
    sender: "DemoSender",
    recipient: "447903749662",
    contentType: "text",
    text: "hello",
    smsFallbackMessage: "sms hello",
    smsFallbackSender: "Acme",
  }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/rcs/messages");
  assertEquals(bodyOf(calls[0]), {
    sender: "DemoSender",
    recipient: "447903749662",
    content_type: "text",
    content: { text: { message: "hello" } },
    sms_fallback: { sender: "Acme", message: "sms hello" },
  });
  assertEquals(out.id, "r1");
});

Deno.test("rcs-send: media content and validation", () => {
  assertEquals(
    buildContent({
      sender: "s",
      recipient: "r",
      contentType: "media",
      mediaUrl: "https://e.com/a.png",
    }),
    { media: { url: "https://e.com/a.png" } },
  );
  assertThrows(
    () => buildContent({ sender: "s", recipient: "r", contentType: "media" }),
    Error,
    "mediaUrl",
  );
  assertThrows(
    () => buildContent({ sender: "s", recipient: "r", contentType: "text" }),
    Error,
    "text",
  );
});

Deno.test("rcs-send: is not idempotent", () => assertEquals(rcsSend.idempotent, false));
