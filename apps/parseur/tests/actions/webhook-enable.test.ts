import { assertEquals } from "@std/assert";
import webhookEnable from "../../actions/webhook-enable.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-enable: POSTs /parser/{mailboxId}/webhook_set/{id} and returns the mailbox's webhook fields", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: 42,
        webhook_set: [{ id: 1 }],
        available_webhook_set: [{ id: 1 }, { id: 2 }],
      },
    },
  ]);
  const out = await webhookEnable.execute({ mailboxId: "42", webhookId: "1" }, ctx) as {
    webhook_set: unknown[];
    available_webhook_set: unknown[];
  };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/parser/42/webhook_set/1");
  assertEquals(out.webhook_set.length, 1);
  assertEquals(out.available_webhook_set.length, 2);
});

Deno.test("webhook-enable: is idempotent", () => {
  assertEquals(webhookEnable.idempotent, true);
});
