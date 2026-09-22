import { assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("webhook-create: POSTs the url and triggers and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "507f191e810c19729de860ea" } }]);
  const result = await webhookCreate.execute(
    { url: "https://example.com/hook", triggers: ["INCOMING_MESSAGE", "OUTGOING_MESSAGE"] },
    ctx,
  ) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/api/webhooks`);
  assertEquals(bodyOf(calls[0]), {
    url: "https://example.com/hook",
    triggers: ["INCOMING_MESSAGE", "OUTGOING_MESSAGE"],
  });
  assertEquals(result.id, "507f191e810c19729de860ea");
});

/** A trigger that never fires is worse than a refused request. */
Deno.test("webhook-create: refuses an empty trigger list before the request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await webhookCreate.execute({ url: "https://example.com/hook", triggers: [] }, ctx),
    Error,
    "trigger",
  );
  assertEquals(calls.length, 0);
});

Deno.test("webhook-create: requestPerSecLimit caps at the vendor's documented maximum", () => {
  const limit = webhookCreate.params!.find((p) => p.key === "requestPerSecLimit");
  assertEquals(limit?.validation, { integer: true, min: 1, max: 25 });
});

Deno.test("webhook-create: is not idempotent — the endpoint declares no idempotency key", () => {
  assertEquals(webhookCreate.idempotent, false);
});
