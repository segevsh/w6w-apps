import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhooksCreate from "../../actions/webhooks-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhooks-create: POSTs to /webhook/subscribe, not /webhook", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 1234, webhook_url: "https://hooks.example.com/webhook" } },
  ]);
  await webhooksCreate.execute(
    { webhookUrl: "https://hooks.example.com/webhook", subscriptions: ["list.created"] },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/webhook/subscribe");
  assertEquals(JSON.parse(calls[0].body!), {
    webhook_url: "https://hooks.example.com/webhook",
    subscriptions: ["list.created"],
  });
});
