import { assertEquals } from "@std/assert";
import webhookSubscribe from "../../actions/webhook-subscribe.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-subscribe: calls POST /subscribe with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { subscription_id: 253485285 } }]);
  const out = await webhookSubscribe.execute(
    { event: "*", targetUrl: "https://example.com/hook", triggerFields: { mode_int: 2 } },
    ctx,
  ) as { subscription_id: number };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/external/subscribe");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(jsonBodyOf(calls[0]), {
    event: "*",
    target_url: "https://example.com/hook",
    trigger_fields: { mode_int: 2 },
  });
  assertEquals(out.subscription_id, 253485285);
});

Deno.test("webhook-subscribe: is not idempotent", () => {
  assertEquals(webhookSubscribe.idempotent, false);
});
