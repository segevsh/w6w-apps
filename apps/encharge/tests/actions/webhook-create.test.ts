import { assert, assertEquals, assertRejects } from "@std/assert";
import webhookCreate from "../../actions/webhook-create.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof webhookCreate.execute>[1], input: Record<string, unknown>) =>
  webhookCreate.execute(input as never, ctx) as Promise<unknown>;

Deno.test("webhook-create: declares a non-idempotent perform action", () => {
  assertEquals(webhookCreate.key, "webhook-create");
  assertEquals(webhookCreate.type, "perform");
  assertEquals(webhookCreate.idempotent, false);
  assert((webhookCreate.description ?? "").length > 0);
  assert(Array.isArray(webhookCreate.output) && webhookCreate.output.length > 0);
});

Deno.test("webhook-create: POSTs eventType and targetUrl and returns the subscription", async () => {
  const reply = { subscription: { id: 77 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const out = await run(ctx, {
    eventType: "added-tag-signed-up",
    targetUrl: "https://x.test/hook",
  });
  assertEquals(out, reply);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/event-subscriptions");
  assertEquals(JSON.parse(calls[0].body!), {
    eventType: "added-tag-signed-up",
    targetUrl: "https://x.test/hook",
  });
});

Deno.test("webhook-create: requires both fields; failures are thrown", async () => {
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, { targetUrl: "https://x.test" }), Error, "eventType");
  await assertRejects(() => run(none.ctx, { eventType: "newUser" }), Error, "targetUrl");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 400, body: errBody("Unknown event") }]);
  await assertRejects(
    () => run(ctx, { eventType: "x", targetUrl: "https://x.test" }),
    Error,
    "Unknown event",
  );
});
