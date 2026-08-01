import { assertEquals } from "@std/assert";
import { mockXeroCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /Contacts wrapping a single Contact in the Contacts array", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: { Contacts: [{ ContactID: "c1" }] } }]);
  await action.execute({ name: "Acme Ltd" }, ctx);
  assertEquals(calls[0].url, "https://api.xero.com/api.xro/2.0/Contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { Contacts: [{ Name: "Acme Ltd" }] });
});

Deno.test("contact-create: merges additionalFields alongside Name", async () => {
  const { ctx, calls } = mockXeroCtx([{ body: {} }]);
  await action.execute({
    name: "Acme Ltd",
    additionalFields: { EmailAddress: "a@acme.test", FirstName: "Ada" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Contacts[0], {
    Name: "Acme Ltd",
    EmailAddress: "a@acme.test",
    FirstName: "Ada",
  });
});
