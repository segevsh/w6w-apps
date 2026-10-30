import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-get: GETs /webhooks/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uuid: "wh-1", event_type: "signed" } }]);
  const out = await webhookGet.execute({ webhookId: "wh-1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0]), "/api/v1/webhooks/wh-1/");
  assertEquals(out.event_type, "signed");
});
