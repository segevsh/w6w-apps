import { assertEquals } from "@std/assert";
import rowGet from "../../actions/row-get.ts";
import { BASE_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("row-get: GETs /rows/{id}/ with the table name", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "Bko1e60YT-egit2SljWSZA", Name: "A" } }]);
  const out = await rowGet.execute(
    { tableName: "Table1", rowId: "Bko1e60YT-egit2SljWSZA" },
    ctx,
  ) as {
    _id: string;
  };
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/Bko1e60YT-egit2SljWSZA/`);
  assertEquals(queryOf(calls[0].url), { table_name: "Table1", convert_keys: "true" });
  assertEquals(out._id, "Bko1e60YT-egit2SljWSZA");
});

Deno.test("row-get: the row id is path-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowGet.execute({ tableName: "T", rowId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/a%2Fb/`);
});
