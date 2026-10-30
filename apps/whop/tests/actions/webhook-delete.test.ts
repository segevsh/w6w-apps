import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /webhooks/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "hook_1", deleted: true } }]);
  const out = await webhookDelete.execute({ webhookId: "hook_1" }, ctx) as { deleted: boolean };
  assertEquals(pathOf(calls[0].url), "/webhooks/hook_1");
  assertEquals(out.deleted, true);
});
