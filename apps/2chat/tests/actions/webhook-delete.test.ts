import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import webhookDelete from "../../actions/webhook-delete.ts";

test("webhook-delete: deletes by uuid", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await webhookDelete.execute!({ "webhookUuid": "WHK1" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "DELETE");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/webhooks/WHK1");
  assert.deepStrictEqual(calls[0].body, null);
});
