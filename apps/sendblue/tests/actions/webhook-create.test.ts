import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookCreate from "../../actions/webhook-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-create: a bare URL with no scoping numbers posts a plain string entry", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookCreate.execute({ url: "https://example.com/hook", type: "receive" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/account/webhooks");
  assertEquals(jsonBodyOf(calls[0]), {
    webhooks: ["https://example.com/hook"],
    type: "receive",
  });
});

test("webhook-create: scoping to Sendblue numbers posts a WebhookConfiguration object", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookCreate.execute({
    url: "https://example.com/hook",
    sendblueNumbers: ["+1", "+2"],
  }, ctx);

  assertEquals(jsonBodyOf(calls[0]), {
    webhooks: [{ url: "https://example.com/hook", sendblue_numbers: ["+1", "+2"] }],
  });
});
