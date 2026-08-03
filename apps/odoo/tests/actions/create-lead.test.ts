import { assert, assertEquals } from "@std/assert";
import action from "../../actions/create-lead.ts";
import { executeKwArgs, mockCtx, param } from "../_helpers.ts";

Deno.test("create-lead: is a non-idempotent perform over crm.lead", () => {
  assertEquals(action.key, "create-lead");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "crm.lead");
  assertEquals(action.idempotent, false);
});

Deno.test("create-lead: maps the form onto Odoo's real field names", async () => {
  // email_from, contact_name and expected_revenue are the field names people
  // most often guess wrong.
  const { ctx, calls } = mockCtx([{ result: 30 }]);
  const out = await action.execute({
    name: "Website redesign",
    type: "opportunity",
    partnerId: 9,
    contactName: "Bob",
    emailFrom: "bob@acme.com",
    phone: "123",
    expectedRevenue: 5000,
  }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "crm.lead",
    method: "create",
    args: [{
      name: "Website redesign",
      type: "opportunity",
      partner_id: 9,
      contact_name: "Bob",
      email_from: "bob@acme.com",
      phone: "123",
      expected_revenue: 5000,
    }],
    kwargs: {},
  });
  assertEquals(out, { id: 30 });
});

Deno.test("create-lead: only the pipeline title is required", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({ name: "Just a title" }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [{ name: "Just a title" }]);
});

Deno.test("create-lead: offers exactly Odoo's two lead types", () => {
  const options = param(action, "type").options;
  assert(Array.isArray(options));
  assertEquals(options.map((o) => o.value), ["lead", "opportunity"]);
});
