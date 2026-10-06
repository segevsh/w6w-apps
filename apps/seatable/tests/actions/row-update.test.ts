import { assertEquals, assertRejects } from "@std/assert";
import rowUpdate from "../../actions/row-update.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("row-update: PUTs table_name and updates to /rows/", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const updates = [{ row_id: "Bko1e60YT-egit2SljWSZA", row: { Name: "Max" } }];
  const out = await rowUpdate.execute({ tableName: "Table1", updates }, ctx) as {
    success: boolean;
  };
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/`);
  assertEquals(bodyOf(calls[0]), { table_name: "Table1", updates });
  assertEquals(out.success, true);
});

Deno.test("row-update: updates may arrive as JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await rowUpdate.execute({ tableName: "T", updates: '[{"row_id":"x","row":{"a":1}}]' }, ctx);
  assertEquals(bodyOf(calls[0]).updates, [{ row_id: "x", row: { a: 1 } }]);
});

Deno.test("row-update: an empty updates array is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await rowUpdate.execute({ tableName: "T", updates: [] }, ctx);
    },
    Error,
    "at least one entry",
  );
  assertEquals(calls.length, 0);
});

Deno.test("row-update: is declared idempotent", () => {
  assertEquals(rowUpdate.idempotent, true);
});
