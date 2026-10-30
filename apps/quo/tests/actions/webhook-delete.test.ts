import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETEs /v1/webhooks/{id} and reports deleted:true on 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await webhookDelete.execute({ id: "WH1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/WH1");
  assertEquals(out, { deleted: true });
});

test("webhook-delete: is an idempotent perform action", () => {
  assertEquals(webhookDelete.type, "perform");
  assertEquals(webhookDelete.idempotent, true);
});
