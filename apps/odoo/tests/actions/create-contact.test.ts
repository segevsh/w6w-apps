import { assertEquals } from "@std/assert";
import action from "../../actions/create-contact.ts";
import { executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("create-contact: is a non-idempotent perform over res.partner", () => {
  assertEquals(action.key, "create-contact");
  assertEquals(action.type, "perform");
  assertEquals(action.resource, "res.partner");
  assertEquals(action.idempotent, false);
});

Deno.test("create-contact: create takes the values POSITIONALLY, never as a kwarg", async () => {
  // Verified live: kwargs {vals_list: [...]} fails with IndexError, because
  // create is @api.model_create_multi and dispatches by position.
  const { ctx, calls } = mockCtx([{ result: 167 }]);
  const out = await action.execute({
    name: "Acme",
    email: "a@b.com",
    phone: "123",
    isCompany: true,
  }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "create",
    args: [{ name: "Acme", email: "a@b.com", phone: "123", is_company: true }],
    kwargs: {},
  });
  assertEquals(out, { id: 167 });
});

Deno.test("create-contact: maps form keys onto Odoo's own field names", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({ name: "Bob", isCompany: false, parentId: 9 }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [{ name: "Bob", is_company: false, parent_id: 9 }]);
});

Deno.test("create-contact: omits fields the caller left blank", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({ name: "Bob" }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [{ name: "Bob" }]);
});

Deno.test("create-contact: merges Additional Values over the typed fields", async () => {
  const { ctx, calls } = mockCtx([{ result: 1 }]);
  await action.execute({ name: "Bob", values: { function: "CTO", name: "Robert" } }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [{ name: "Robert", function: "CTO" }]);
});
