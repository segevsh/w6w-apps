import { assert, assertEquals } from "@std/assert";
import action from "../../actions/describe-model.ts";
import { description, executeKwArgs, mockCtx, param } from "../_helpers.ts";

Deno.test("describe-model: is a read action", () => {
  assertEquals(action.key, "describe-model");
  assertEquals(action.type, "read");
});

Deno.test("describe-model: fields_get is model-level — empty args, everything in kwargs", async () => {
  // Verified live on crm.lead: {allfields, attributes} in kwargs returned
  // {"email_from":{"string":"Email","type":"char"}}.
  const { ctx, calls } = mockCtx([{ result: { email_from: { string: "Email", type: "char" } } }]);
  const out = await action.execute({
    model: "crm.lead",
    fields: "email_from",
    attributes: "string,type",
  }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "crm.lead",
    method: "fields_get",
    args: [],
    kwargs: { allfields: ["email_from"], attributes: ["string", "type"] },
  });
  assertEquals(out, { fields: { email_from: { string: "Email", type: "char" } }, count: 1 });
});

Deno.test("describe-model: describes every field when none are named", async () => {
  const { ctx, calls } = mockCtx([{ result: {} }]);
  await action.execute({ model: "res.partner", attributes: "type" }, ctx);
  assertEquals(executeKwArgs(calls[0]).kwargs, { attributes: ["type"] });
});

Deno.test("describe-model: defaults to a narrow, useful attribute set", () => {
  // The full response for a model like crm.lead is enormous.
  const attributes = String(param(action, "attributes").default);
  for (const a of ["string", "type", "required", "relation", "selection"]) {
    assert(attributes.includes(a), `default attributes should include ${a}`);
  }
});

Deno.test("describe-model: sells itself on Odoo's non-obvious field names", () => {
  assert(/email_from/.test(description(action)));
});
