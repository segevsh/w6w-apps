import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import whatsappSend, { buildContent } from "../../actions/whatsapp-send.ts";
import { bodyOf, envelope, mockCtx, pathOf, problem } from "../_helpers.ts";

Deno.test("whatsapp-send: template content is keyed by content type and unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "w1", content_type: "template" }) }]);
  const out = await whatsappSend.execute({
    recipient: "+14155238886",
    contentType: "template",
    templateName: "order_update",
    templateParameters: '["123"]',
    templateLocale: "en_US",
    smsFallbackMessage: "fallback",
    messageRef: "r",
  }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v2/whatsapp/messages");
  assertEquals(bodyOf(calls[0]), {
    recipient: "+14155238886",
    content_type: "template",
    content: { template: { name: "order_update", parameters: ["123"], locale: "en_US" } },
    sms_fallback: { message: "fallback" },
    message_ref: "r",
  });
  assertEquals(out.id, "w1");
});

Deno.test("whatsapp-send: text and custom content", () => {
  assertEquals(buildContent({ recipient: "r", contentType: "text", text: "hi" }), {
    text: { message: "hi" },
  });
  assertEquals(
    buildContent({ recipient: "r", contentType: "custom", custom: '{"type":"template"}' }),
    { custom: { type: "template" } },
  );
});

Deno.test("whatsapp-send: missing content for the chosen type is refused before any request", () => {
  assertThrows(() => buildContent({ recipient: "r", contentType: "text" }), Error, "text");
  assertThrows(
    () => buildContent({ recipient: "r", contentType: "template" }),
    Error,
    "templateName",
  );
  assertThrows(() => buildContent({ recipient: "r", contentType: "custom" }), Error, "custom");
});

Deno.test("whatsapp-send: RFC 9457 errors surface with title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: problem(400, "Invalid Request", "bad recipient"),
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        whatsappSend.execute({ recipient: "x", contentType: "text", text: "t" }, ctx),
      ),
    Error,
    "Invalid Request: bad recipient",
  );
});

Deno.test("whatsapp-send: is not idempotent", () => assertEquals(whatsappSend.idempotent, false));
