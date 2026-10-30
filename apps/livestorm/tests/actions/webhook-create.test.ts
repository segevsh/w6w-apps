import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookCreate from "../../actions/webhook-create.ts";
import type { JsonApiResource } from "../../lib/client.ts";
import { mockCtx, pathOf, single } from "../_helpers.ts";

test("webhook-create: POSTs a webhooks body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: single("webhooks", "w1", { url: "https://x.test", event: "session.started" }),
  }]);
  const result = await webhookCreate.execute(
    { url: "https://x.test", event: "session.started" },
    ctx,
  ) as JsonApiResource;

  assertEquals(pathOf(calls[0].url), "/v1/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { type: "webhooks", attributes: { url: "https://x.test", event: "session.started" } },
  });
  assertEquals(result.id, "w1");
});
