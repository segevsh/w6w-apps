import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-list: GETs the un-versioned /api/account/webhooks", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", webhooks: {} } }]);
  await webhookList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/account/webhooks");
});
