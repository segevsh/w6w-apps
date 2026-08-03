import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: requires a lead id, because contacts cannot stand alone", () => {
  assertEquals(action.params?.find((p) => p.key === "leadId")?.required, true);
  assertEquals(action.idempotent, false);
});

Deno.test("create-contact: POSTs /contact/ with typed emails and phones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "cont_1" } }]);
  await action.execute({
    leadId: "lead_1",
    name: "Gob",
    title: "SVP",
    emails: [{ email: "gob@example.com", type: "office" }],
    phones: [{ phone: "+18004445555", type: "office" }],
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contact/");
  assertEquals(JSON.parse(calls[0].body!), {
    lead_id: "lead_1",
    name: "Gob",
    title: "SVP",
    emails: [{ email: "gob@example.com", type: "office" }],
    phones: [{ phone: "+18004445555", type: "office" }],
  });
});

Deno.test("create-contact: flattens custom fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", customFields: { cf_a: "x" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!)["custom.cf_a"], "x");
});
