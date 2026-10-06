import { assertEquals } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("webhook-create: calls POST /webhooks/subscriptions and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1" } }]);
  const result = await webhookCreate.execute(
    {
      "type": "inbound_text.received",
      "callbackUrl": "https://example.com/hook",
      "secret": "s3",
      "insecureSsl": false,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/webhooks/subscriptions`);
  assertEquals(bodyOf(calls[0]), {
    "type": "inbound_text.received",
    "callbackUrl": "https://example.com/hook",
    "secret": "s3",
    "insecureSsl": false,
  });
  assertEquals(result, { "id": "w1" });
});

Deno.test("webhook-create: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "w1" } }]);
  await webhookCreate.execute(
    {
      "type": "inbound_text.received",
      "callbackUrl": "https://example.com/hook",
      "secret": "s3",
      "insecureSsl": false,
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});
