import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-log-get.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-log-get: gets one delivery", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3899 }) }]);
  const out = await exec(action, { webhookId: "39", logId: "3899" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks/39/logs/3899");
  assertEquals(out.log, { id: 3899 });
});
