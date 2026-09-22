import { assertEquals } from "@std/assert";
import categoryCreate from "../../actions/category-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("category-create: POSTs to /categories and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 10869029 } }]);
  const out = await categoryCreate.execute(
    { name: "Lemons", enabled: true, orderBy: 10, parentId: 9691094 },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/1003/categories");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    name: "Lemons",
    enabled: true,
    orderBy: 10,
    parentId: 9691094,
  });
  assertEquals(out.id, 10869029);
});

Deno.test("category-create: only the name is required — the parent defaults to 0 server-side", async () => {
  assertEquals(categoryCreate.params?.find((p) => p.key === "name")?.required, true);
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await categoryCreate.execute({ name: "Lemons" }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "Lemons" });
});
