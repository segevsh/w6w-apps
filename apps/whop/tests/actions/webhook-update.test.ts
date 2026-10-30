import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookUpdate from "../../actions/webhook-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-update: PATCHes only the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "hook_1", enabled: false } }]);
  await webhookUpdate.execute({ webhookId: "hook_1", enabled: false }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/webhooks/hook_1");
  assertEquals(JSON.parse(calls[0].body!), { enabled: false });
});
