import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /Contacts/{id}", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Contacts: [{ ContactID: "c1" }] } }]);
  const out = await action.execute({ contactId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Contacts/c1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { Contacts: [{ ContactID: "c1" }] });
});
