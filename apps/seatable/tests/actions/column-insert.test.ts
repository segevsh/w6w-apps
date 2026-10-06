import { assertEquals, assertRejects } from "@std/assert";
import columnInsert, { COLUMN_TYPES } from "../../actions/column-insert.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("column-insert: POSTs the column definition to /columns/", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "e48W", name: "Age", type: "number" } }]);
  const out = await columnInsert.execute(
    { tableName: "T", columnName: "Age", columnType: "number" },
    ctx,
  ) as { key: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/columns/`);
  assertEquals(bodyOf(calls[0]), { table_name: "T", column_name: "Age", column_type: "number" });
  assertEquals(out.key, "e48W");
});

Deno.test("column-insert: anchor and column_data are forwarded when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await columnInsert.execute(
    {
      tableName: "T",
      columnName: "Price",
      columnType: "number",
      anchorColumn: "Name",
      columnData: '{"decimal":"dot","thousands":"comma"}',
    },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).anchor_column, "Name");
  assertEquals(bodyOf(calls[0]).column_data, { decimal: "dot", thousands: "comma" });
});

Deno.test("column-insert: column settings that are not an object are refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await columnInsert.execute(
        { tableName: "T", columnName: "x", columnType: "date", columnData: "[1]" },
        ctx,
      );
    },
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("column-insert: the type select offers exactly the vendor's 24 column types", () => {
  assertEquals(COLUMN_TYPES.length, 24);
  const param = columnInsert.params?.find((p) => p.key === "columnType");
  assertEquals(Array.isArray(param?.options) ? param.options.length : -1, 24);
});
