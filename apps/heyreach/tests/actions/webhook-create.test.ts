import { assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/webhooks/CreateWebhook";

Deno.test("webhook-create: POSTs the documented body and returns the status only", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({
    webhookName: "Replies",
    webhookUrl: "https://example.com/hooks/heyreach",
    eventType: "EVERY_MESSAGE_REPLY_RECEIVED",
  }, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(calls[0].method, "POST");
  assertEquals(jsonBody(calls[0]), {
    webhookName: "Replies",
    webhookUrl: "https://example.com/hooks/heyreach",
    eventType: "EVERY_MESSAGE_REPLY_RECEIVED",
  });
  // The document publishes no 200 body, so there is nothing else to return.
  assertEquals(result, { status: 200 });
});

Deno.test("webhook-create: an empty campaign list means all campaigns, so it is omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    webhookName: "Replies",
    webhookUrl: "https://example.com/hooks/heyreach",
    eventType: "MESSAGE_SENT",
  }, ctx);
  assertEquals("campaignIds" in jsonBody(calls[0]), false);
});

Deno.test("webhook-create: campaign ids are sent as integers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  await action.execute!({
    webhookName: "Replies",
    webhookUrl: "https://example.com/hooks/heyreach",
    eventType: "MESSAGE_SENT",
    campaignIds: "5,6",
  }, ctx);
  assertEquals(jsonBody(calls[0]).campaignIds, [5, 6]);
});
