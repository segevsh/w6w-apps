import { assertEquals } from "@std/assert";
import action from "../../actions/contact-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-create: POSTs snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "c1" } } }]);
  const out = await action.execute!({
    name: "Ada",
    email: "ada@acme.com",
    accountExternalId: "acme-1",
    phoneNumbers: "+1555, +1666",
    portalRole: "member",
    customFields: { team: "ops" },
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/contacts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Ada",
    email: "ada@acme.com",
    account_external_id: "acme-1",
    phone_numbers: ["+1555", "+1666"],
    portal_role: "member",
    custom_fields: [{ slug: "team", value: "ops" }],
  });
  assertEquals(out, { id: "c1" });
  assertEquals(action.idempotent, false);
});
