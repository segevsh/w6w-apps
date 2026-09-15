import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contacts/people with the mapped body", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 1, firstname: "Max", lastname: "Muster" } }]);
  const out = await action.execute({
    firstname: "Max",
    lastname: "Muster",
    workEmail: "max@example.com",
    companyId: 1233434,
    tags: "VIP",
    customProperties: { LinkedIn: "https://linkedin.com/in/maxmuster" },
  }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/contacts/people");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.firstname, "Max");
  assertEquals(body.lastname, "Muster");
  assertEquals(body.work_email, "max@example.com");
  assertEquals(body.company_id, 1233434);
  assertEquals(body.tags, ["VIP"]);
  assertEquals(body.custom_properties, { LinkedIn: "https://linkedin.com/in/maxmuster" });
  assertEquals(out, { id: 1, firstname: "Max", lastname: "Muster" });
});

Deno.test("contact-create: omits unset optional fields entirely", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 1 } }]);
  await action.execute({ firstname: "Max", lastname: "Muster" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("company_id" in body, false);
  assertEquals("tags" in body, false);
});
