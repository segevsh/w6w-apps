import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: hits GET /webhooks with no params", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope("webhooks", [{ id: 1, topic: "subscription/created" }]) },
  ]);
  const out = await webhookList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(out.items, [{ id: 1, topic: "subscription/created" }]);
});

test("webhook-list: takes no parameters", () => {
  assertEquals(webhookList.params?.length, 0);
});
