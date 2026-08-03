import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";

import getWebhook from "../../actions/get-webhook.ts";

Deno.test("get-webhook: GET /v1/webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh1", post_url: "https://e.com/h" } }]);
  await getWebhook.execute({ webhookId: "wh1" }, ctx);
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/webhooks/wh1");
});
