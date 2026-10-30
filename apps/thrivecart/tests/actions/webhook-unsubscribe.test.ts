import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookUnsubscribe from "../../actions/webhook-unsubscribe.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("webhook-unsubscribe: calls POST /unsubscribe with the target url", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await webhookUnsubscribe.execute({ url: "https://example.com/hook" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/external/unsubscribe");
  assertEquals(formOf(calls[0]), { url: "https://example.com/hook" });
});

test("webhook-unsubscribe: is idempotent", () => {
  assertEquals(webhookUnsubscribe.idempotent, true);
});
