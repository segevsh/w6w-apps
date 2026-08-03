import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import createContactList from "../../actions/create-contact-list.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Name: "Newsletter" }], Total: 1 } };

// ---------------------------------------------------------- create-contact-list

Deno.test("create-contact-list: POSTs Name", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await createContactList.execute!({ name: "Newsletter" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contactslist");
  assertEquals(JSON.parse(calls[0].body!), { Name: "Newsletter" });
});
