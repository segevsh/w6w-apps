import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookCreate, { webhookEventOptions } from "../../actions/webhook-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-create: POSTs url and the selected events to /webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "wh_1", signature: "whsec_x" }) }]);
  await webhookCreate.execute(
    { url: "https://example.com/hook", events: ["transaction.succeeded", "contact.created"] },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com/hook",
    events: ["transaction.succeeded", "contact.created"],
  });
});

test("webhook-create: the 12 documented event types are exactly the options offered", () => {
  assertEquals(webhookEventOptions.length, 12);
  assertEquals(
    webhookEventOptions.map((o) => o.value).sort(),
    [
      "campaign.created",
      "campaign.updated",
      "contact.created",
      "plan.canceled",
      "plan.created",
      "plan.failed",
      "plan.paused",
      "plan.resumed",
      "plan.updated",
      "refund.created",
      "ticket.created",
      "transaction.succeeded",
    ],
  );
});
