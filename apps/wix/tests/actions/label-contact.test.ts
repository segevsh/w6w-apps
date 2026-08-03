import { assertEquals } from "@std/assert";
import action from "../../actions/label-contact.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("label-contact: POSTs the label keys to the contact's labels sub-resource", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact: {} } }]);
  await action.execute!({ contactId: "c1", labelKeys: "custom.vip" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/c1/labels");
  assertEquals(JSON.parse(calls[0].body!), { labelKeys: ["custom.vip"] });
});

Deno.test("label-contact: splits a comma list and trims each key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ contactId: "c1", labelKeys: " custom.a , custom.b ,, " }, ctx);
  assertEquals(JSON.parse(calls[0].body!).labelKeys, ["custom.a", "custom.b"]);
});

Deno.test("label-contact: is an idempotent perform action", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
