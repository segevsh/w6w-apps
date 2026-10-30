import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import contactDelete from "../../actions/contact-delete.ts";

test("contact-delete: deletes by uuid", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await contactDelete.execute!({ "contactUuid": "CON9" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "DELETE");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/contacts/CON9");
  assert.deepStrictEqual(calls[0].body, null);
});
