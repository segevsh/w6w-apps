import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import webhookDelete from "../../actions/webhook-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("webhook-delete: DELETE /v1/webhooks/{id}, secret removed from result", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_1", state: "deleted", secret: "whsec_abc" } }]);
  const out = await webhookDelete.execute({ webhookId: "wh_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/wh_1");
  assertEquals(out, { id: "wh_1", state: "deleted" });
});
