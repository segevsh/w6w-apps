import { assert, assertEquals } from "@std/assert";
import action from "../../actions/get-contact.ts";
import { description, executeKwArgs, mockCtx } from "../_helpers.ts";

Deno.test("get-contact: is a read action over res.partner", () => {
  assertEquals(action.key, "get-contact");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "res.partner");
});

Deno.test("get-contact: read takes ids POSITIONALLY and fields as a keyword", async () => {
  const { ctx, calls } = mockCtx([{ result: [{ id: 42, name: "A" }] }]);
  await action.execute({ ids: "42", fields: "name" }, ctx);

  assertEquals(executeKwArgs(calls[0]), {
    model: "res.partner",
    method: "read",
    args: [[42]],
    kwargs: { fields: ["name"] },
  });
});

Deno.test("get-contact: accepts several comma-separated ids", async () => {
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await action.execute({ ids: "1, 2,3" }, ctx);
  assertEquals(executeKwArgs(calls[0]).args, [[1, 2, 3]]);
});

Deno.test("get-contact: omits fields entirely when none are named", async () => {
  // `fields: []` would mean "every field" to Odoo — a very different request.
  const { ctx, calls } = mockCtx([{ result: [] }]);
  await action.execute({ ids: 1 }, ctx);
  assertEquals(executeKwArgs(calls[0]).kwargs, {});
});

Deno.test("get-contact: surfaces missing ids as a short list, per Odoo's real behaviour", async () => {
  // Verified live: reading a deleted id returns [], it does not raise.
  const { ctx } = mockCtx([{ result: [{ id: 1 }] }]);
  assertEquals(await action.execute({ ids: "1,2,3" }, ctx), { records: [{ id: 1 }], count: 1 });
  assert(/skipped/i.test(description(action)));
});
