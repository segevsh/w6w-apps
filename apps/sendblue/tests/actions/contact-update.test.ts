import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("contact-update: PUTs to /api/v2/contacts/{phone_number}", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", contact: {} } }]);
  await contactUpdate.execute({ phoneNumber: "+1", lastName: "Doe" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/%2B1");
  assertEquals(jsonBodyOf(calls[0]), { last_name: "Doe" });
});
