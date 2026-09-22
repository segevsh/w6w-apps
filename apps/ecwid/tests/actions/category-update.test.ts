import { assertEquals } from "@std/assert";
import categoryUpdate from "../../actions/category-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("category-update: PUTs a partial body, as the vendor's own example does", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  const out = await categoryUpdate.execute(
    { categoryId: "9691094", description: "Temporary hidden", enabled: false },
    ctx,
  ) as { updateCount: number };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/categories/9691094");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    description: "Temporary hidden",
    enabled: false,
  });
  assertEquals(out.updateCount, 1);
});

Deno.test("category-update: additional fields are merged, and win", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await categoryUpdate.execute(
    { categoryId: "1", name: "A", extraFields: '{"name":"B","customSlug":"b"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "B", customSlug: "b" });
});

Deno.test("category-update: moving a category is a parentId change", async () => {
  const { ctx, calls } = mockCtx([{ body: { updateCount: 1 } }]);
  await categoryUpdate.execute({ categoryId: "1", parentId: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { parentId: 0 });
});
