import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

test("contact-get: hits GET /crm/v1/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 5 } } }]);
  const result = await action.execute!({ contactId: 5 }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/contacts/5");
  assertEquals(result, { data: { id: 5 } });
});
