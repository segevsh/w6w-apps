import { assertEquals } from "@std/assert";
import categoryDelete from "../../actions/category-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("category-delete: DELETEs /categories/{id} and reports deleteCount", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleteCount: 1 } }]);
  const out = await categoryDelete.execute({ categoryId: "9691094" }, ctx) as {
    deleteCount: number;
  };

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/categories/9691094");
  assertEquals(out.deleteCount, 1);
});

Deno.test("category-delete: a deleteCount of 0 is surfaced", async () => {
  const { ctx } = mockCtx([{ body: { deleteCount: 0 } }]);
  assertEquals(await categoryDelete.execute({ categoryId: "1" }, ctx), { deleteCount: 0 });
});

Deno.test("category-delete: idempotent in the sense the runtime cares about", () => {
  assertEquals(categoryDelete.idempotent, true);
});
