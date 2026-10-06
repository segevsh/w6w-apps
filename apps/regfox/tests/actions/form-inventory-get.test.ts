import { assertEquals } from "@std/assert";
import action from "../../actions/form-inventory-get.ts";
import { envelope, exec, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-inventory-get: returns the inventory array for the form", async () => {
  const items = [{ path: "ticket-a", name: "Adult", sold: 3, quantity: 97 }];
  const { ctx, calls } = mockCtx([{ body: envelope(items) }]);
  const out = await exec(action, { formId: "676" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/public/forms/676/inventory");
  assertEquals(out.inventory, items);
});

Deno.test("form-inventory-get: a missing data field yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: { responseCode: 200 } }]);
  assertEquals((await exec(action, { formId: "1" }, ctx)).inventory, []);
});
