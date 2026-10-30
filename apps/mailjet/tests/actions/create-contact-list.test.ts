import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import createContactList from "../../actions/create-contact-list.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Name: "Newsletter" }], Total: 1 } };

// ---------------------------------------------------------- create-contact-list

test("create-contact-list: POSTs Name", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await createContactList.execute!({ name: "Newsletter" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contactslist");
  assertEquals(JSON.parse(calls[0].body!), { Name: "Newsletter" });
});
