import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactBulkCreate from "../../actions/contact-bulk-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("contact-bulk-create: POSTs the parsed contacts array to /api/v2/contacts/bulk", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", contacts: [] } }]);
  await contactBulkCreate.execute({ contacts: '[{"phone":"+1"},{"phone":"+2"}]' }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/bulk");
  assertEquals(jsonBodyOf(calls[0]), { contacts: [{ phone: "+1" }, { phone: "+2" }] });
});
