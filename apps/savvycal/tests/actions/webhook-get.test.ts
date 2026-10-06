import { assertEquals } from "@std/assert";
import webhookGet from "../../actions/webhook-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-get: GET /v1/webhooks/{id} without the secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh_1", state: "active", secret: "whsec_abc" } }]);
  const out = await webhookGet.execute({ webhookId: "wh_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/webhooks/wh_1");
  assertEquals(out, { id: "wh_1", state: "active" });
});
