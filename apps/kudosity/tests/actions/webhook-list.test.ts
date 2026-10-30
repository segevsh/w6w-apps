import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: returns the webhooks array", async () => {
  const { ctx, calls } = mockCtx([{ body: { webhooks: [{ id: "w" }] } }]);
  const out = await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhook");
  assertEquals(out, { webhooks: [{ id: "w" }] });
});

test("webhook-list: a missing array becomes empty", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await webhookList.execute({}, ctx), { webhooks: [] });
});
