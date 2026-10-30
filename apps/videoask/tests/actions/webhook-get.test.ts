import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-get: GETs /forms/{formId}/webhooks/{webhookTag}", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://example.com/hook" } }]);
  const out = await webhookGet.execute({ formId: "f1", webhookTag: "hubspot-webhook" }, ctx) as {
    result: { url: string };
  };
  assertEquals(pathOf(calls[0].url), "/forms/f1/webhooks/hubspot-webhook");
  assertEquals(out.result.url, "https://example.com/hook");
});
