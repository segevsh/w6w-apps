import { assert, assertEquals, assertRejects } from "@std/assert";
import webhookDelete from "../../actions/webhook-delete.ts";
import { errBody, mockCtx, pathOf } from "../_helpers.ts";

const run = (ctx: Parameters<typeof webhookDelete.execute>[1], input: Record<string, unknown>) =>
  webhookDelete.execute(input as never, ctx) as Promise<unknown>;

Deno.test("webhook-delete: declares an idempotent perform action", () => {
  assertEquals(webhookDelete.key, "webhook-delete");
  assertEquals(webhookDelete.type, "perform");
  assertEquals(webhookDelete.idempotent, true);
  assert((webhookDelete.description ?? "").length > 0);
  assert(Array.isArray(webhookDelete.output) && webhookDelete.output.length > 0);
});

Deno.test("webhook-delete: DELETEs /event-subscriptions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await run(ctx, { subscriptionId: 77 }), { ok: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/event-subscriptions/77");
});

Deno.test("webhook-delete: requires an id; failures are thrown", async () => {
  const none = mockCtx([]);
  await assertRejects(() => run(none.ctx, {}), Error, "subscriptionId");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ status: 404, body: errBody("No such subscription") }]);
  await assertRejects(() => run(ctx, { subscriptionId: 1 }), Error, "No such subscription");
});
