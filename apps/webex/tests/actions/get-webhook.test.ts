import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-webhook.ts";

Deno.test("get-webhook: GETs /webhooks/{webhookId} and strips secret", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", secret: "shh", status: "active" } }]);
  const result = await action.execute({ webhookId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/webhooks/w1");
  assertEquals(result, { id: "w1", status: "active" });
});
