import { assertEquals, assertRejects } from "@std/assert";
import rowAppend from "../../actions/row-append.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("row-append: POSTs table_name and rows to /rows/", async () => {
  const { ctx, calls } = mockCtx([{ body: { inserted_row_count: 1, row_ids: [{ _id: "r1" }] } }]);
  const out = await rowAppend.execute(
    { tableName: "Table1", rows: [{ Name: "Max", Age: 21 }] },
    ctx,
  ) as { inserted_row_count: number };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/`);
  assertEquals(bodyOf(calls[0]), { table_name: "Table1", rows: [{ Name: "Max", Age: 21 }] });
  assertEquals(out.inserted_row_count, 1);
});

Deno.test("row-append: rows may arrive as JSON text; apply_default is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowAppend.execute({ tableName: "T", rows: '[{"a":1}]', applyDefault: true }, ctx);
  assertEquals(bodyOf(calls[0]), { table_name: "T", rows: [{ a: 1 }], apply_default: true });
});

Deno.test("row-append: an empty rows array is refused without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await rowAppend.execute({ tableName: "T", rows: [] }, ctx);
    },
    Error,
    "at least one row",
  );
  assertEquals(calls.length, 0);
});

Deno.test("row-append: is not idempotent", () => {
  assertEquals(rowAppend.idempotent, false);
});
