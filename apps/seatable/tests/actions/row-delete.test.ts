import { assertEquals, assertRejects } from "@std/assert";
import rowDelete from "../../actions/row-delete.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("row-delete: sends DELETE /rows/ with table_name and row_ids", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const out = await rowDelete.execute({ tableName: "Table1", rowIds: ["r1", "r2"] }, ctx) as {
    success: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/`);
  assertEquals(bodyOf(calls[0]), { table_name: "Table1", row_ids: ["r1", "r2"] });
  assertEquals(out.success, true);
});

Deno.test("row-delete: row ids may arrive as JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await rowDelete.execute({ tableName: "T", rowIds: '["a","b"]' }, ctx);
  assertEquals(bodyOf(calls[0]).row_ids, ["a", "b"]);
});

Deno.test("row-delete: an empty or non-array row id list is refused without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await rowDelete.execute({ tableName: "T", rowIds: [] }, ctx);
    },
    Error,
    "must not be empty",
  );
  await assertRejects(
    async () => {
      await rowDelete.execute({ tableName: "T", rowIds: '{"a":1}' }, ctx);
    },
    Error,
    "must be a JSON array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("row-delete: is declared idempotent", () => {
  assertEquals(rowDelete.idempotent, true);
});
