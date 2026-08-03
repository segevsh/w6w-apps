import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listContactLists from "../../actions/list-contact-lists.ts";

const ENVELOPE = { body: { Count: 1, Data: [{ ID: 1, Name: "Newsletter" }], Total: 1 } };

// ----------------------------------------------------------- list-contact-lists

Deno.test("list-contact-lists: GETs /v3/REST/contactslist", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listContactLists.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/contactslist");
});

Deno.test("list-contact-lists: forwards Name and IsDeleted", async () => {
  const { ctx, calls } = mockCtx([ENVELOPE]);
  await listContactLists.execute!({ name: "Newsletter", isDeleted: true, limit: 50 }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("Name"), "Newsletter");
  assertEquals(p.get("IsDeleted"), "true");
  assertEquals(p.get("Limit"), "50");
});
