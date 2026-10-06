import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-get.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: returns the webhook without its signing secret", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ id: 29, signingSecret: "s3cret", events: ["registration"] }),
  }]);
  const out = await exec(action, { webhookId: "29" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks/29");
  assertEquals(out.webhook, { id: 29, events: ["registration"] });
});
