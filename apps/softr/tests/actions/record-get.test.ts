import { assertEquals } from "@std/assert";
import recordGet from "../../actions/record-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("record-get: calls GET .../records/{recordId}", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "rec1", tableId: "tbl1", fields: { Name: "Acme" } }) },
  ]);
  const out = await recordGet.execute(
    { databaseId: "db1", tableId: "tbl1", recordId: "rec1" },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records/rec1");
  assertEquals(out.id, "rec1");
});

Deno.test("record-get: fieldNames is passed through as a query flag", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "rec1" }) }]);
  await recordGet.execute(
    { databaseId: "db1", tableId: "tbl1", recordId: "rec1", fieldNames: true },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), { fieldNames: "true" });
});

Deno.test("record-get: the record id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "a/b" }) }]);
  await recordGet.execute({ databaseId: "db1", tableId: "tbl1", recordId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records/a%2Fb");
});
