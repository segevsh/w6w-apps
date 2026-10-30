import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDisable from "../../actions/webhook-disable.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-disable: DELETEs /parser/{mailboxId}/webhook_set/{id}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhook_set: [], available_webhook_set: [{ id: 1 }] } },
  ]);
  const out = await webhookDisable.execute({ mailboxId: "42", webhookId: "1" }, ctx) as {
    webhook_set: unknown[];
    available_webhook_set: unknown[];
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/parser/42/webhook_set/1");
  assertEquals(out.webhook_set, []);
  assertEquals(out.available_webhook_set.length, 1);
});

test("webhook-disable: is idempotent", () => {
  assertEquals(webhookDisable.idempotent, true);
});
