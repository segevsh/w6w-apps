import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-resend.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webhook-resend: POSTs to the resend path with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3899 }) }]);
  const out = await exec(action, { webhookId: "39", logId: "3899" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/public/webhooks/39/resend/3899");
  assertEquals(calls[0].body, null);
  assertEquals(out.response, { id: 3899 });
  assertEquals(action.idempotent, false);
});
