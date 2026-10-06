import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import webhookDelete from "../../actions/webhook-delete.ts";

Deno.test("webhook-delete: deletes by uuid", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await webhookDelete.execute!({ "webhookUuid": "WHK1" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/webhooks/WHK1");
  assertEquals(calls[0].body, null);
});
