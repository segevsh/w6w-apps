import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import contactGet from "../../actions/contact-get.ts";

test("contact-get: gets the contact by uuid", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "contact": { "uuid": "CON58147f7c" } },
  }]);
  await contactGet.execute!({ "contactUuid": "CON58147f7c" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/contacts/CON58147f7c");
  assert.deepStrictEqual(calls[0].body, null);
});

test("contact-get: refuses an empty uuid before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await contactGet.execute!({ "contactUuid": "" } as never, ctx);
  });
  assert.ok(err.message.includes("empty"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
