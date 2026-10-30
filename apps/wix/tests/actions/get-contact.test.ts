import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/get-contact.ts";
import { mockCtx } from "../_helpers.ts";

test("get-contact: GETs the contact by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: { id: "c1", revision: 3 } } }]);
  const out = await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/c1");
  // The revision matters: Update Contact refuses to run without it.
  assertEquals((out as { contact: { revision: number } }).contact.revision, 3);
});

test("get-contact: percent-encodes the id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "a b/c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/a%20b%2Fc");
});

test("get-contact: is a read action", () => {
  assertEquals(action.type, "read");
});
