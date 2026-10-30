import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/delete-contact.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

test("delete-contact: is a perform over res.partner, and NOT idempotent", () => {
  assertEquals(action.key, "delete-contact");
  assertEquals(action.type, "perform");
  // Verified live: a second unlink of the same ids raises MissingError, so a
  // retry converts a succeeded call into a failed one.
  assertEquals(action.idempotent, false);
});

test("delete-contact: unlink takes the id list positionally and nothing else", async () => {
  const { ctx, calls } = mockCtx([{ result: true }]);
  const out = await action.execute({ ids: "166,167" }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "unlink",
    args: [[166, 167]],
    kwargs: {},
  });
  assertEquals(out, { deleted: true, ids: [166, 167] });
});

test("delete-contact: refuses to call out with no ids", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => action.execute({ ids: "" }, ctx) as Promise<unknown>);
  assertEquals(calls.length, 0);
});

test("delete-contact: warns that Odoo refuses to orphan referenced records", () => {
  assert(/references/i.test(description(action)));
});
