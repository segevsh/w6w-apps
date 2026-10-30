import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-delete: DELETEs /api/v2/contacts/{phone_number}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK" } }]);
  await contactDelete.execute({ phoneNumber: "+1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/%2B1");
});
