import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactUpdate from "../../actions/contact-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("contact-update: POSTs to the non-trailing-slash path", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "c1" } }]);
  await contactUpdate.execute({ contactKey: "c1", givenName: "Bruce" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/c1");
  assertEquals(JSON.parse(calls[0].body!), { givenName: "Bruce" });
});
