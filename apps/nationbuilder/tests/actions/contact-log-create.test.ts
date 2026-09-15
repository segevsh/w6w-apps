import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/contact-log-create.ts";

Deno.test("contact-log-create: POSTs /contacts, not /signups — this is a logged attempt, not a person", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: { data: { id: "5", type: "contacts", attributes: { signup_id: "42" } } },
  }]);
  const out = await action.execute({
    signupId: "42",
    contactMethod: "phone_call",
    contactStatus: "answered",
    content: "Discussed the ballot measure",
  }, ctx);
  assertEquals(calls[0].url, "https://acme.nationbuilder.com/api/v2/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "contacts",
      attributes: {
        signup_id: "42",
        contact_method: "phone_call",
        contact_status: "answered",
        content: "Discussed the ballot measure",
      },
    },
  });
  assertEquals(out, { id: "5", type: "contacts", signup_id: "42" });
});
