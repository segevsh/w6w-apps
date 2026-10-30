import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: GET /webhooks and the secret is stripped", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ webhookId: 11, url: "http://x", secret: "password", messages: ["*"] }],
  }]);
  const out = await webhookList.execute({}, ctx) as { items: Array<Record<string, unknown>> };
  assertEquals(pathOf(calls[0].url), "/webhooks");
  assertEquals(out.items, [{ webhookId: 11, url: "http://x", messages: ["*"] }]);
  assertEquals(JSON.stringify(out).includes("password"), false);
});

test("webhook-list: empty account", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  assertEquals(await webhookList.execute({}, ctx), { items: [], count: 0 });
});
