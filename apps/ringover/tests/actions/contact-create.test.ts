import { assertEquals } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-create: POSTs a contacts array and returns the new ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [77] }]);
  const out = await action.execute!({
    firstname: "Ada",
    company: "Acme",
    numbers: '[{"number":"+33 6 12 34 56 78","type":"mobile"}]',
  }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    contacts: [{
      firstname: "Ada",
      company: "Acme",
      numbers: [{ number: 33612345678, type: "mobile" }],
    }],
  });
  assertEquals(out, { contactIds: [77], contactId: 77 });
  assertEquals(action.idempotent, false);
});
