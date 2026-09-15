import { assertEquals } from "@std/assert";
import recordList from "../../actions/record-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("record-list: calls GET .../records and keeps the metadata alongside the data", async () => {
  const { ctx, calls } = mockCtx([
    { body: listEnvelope([{ id: "rec1", tableId: "tbl1", fields: { Name: "Acme" } }]) },
  ]);
  const out = await recordList.execute({ databaseId: "db1", tableId: "tbl1" }, ctx) as {
    data: unknown[];
    metadata: { total?: number };
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records");
  assertEquals(out.data.length, 1);
  assertEquals(out.metadata.total, 1);
});

Deno.test("record-list: offset, limit, fieldNames and viewId are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await recordList.execute(
    { databaseId: "db1", tableId: "tbl1", offset: 20, limit: 5, fieldNames: true, viewId: "v1" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    offset: "20",
    limit: "5",
    fieldNames: "true",
    viewId: "v1",
  });
});

Deno.test("record-list: an empty page is not an error", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([]) }]);
  const out = await recordList.execute({ databaseId: "db1", tableId: "tbl1" }, ctx) as {
    data: unknown[];
  };
  assertEquals(out.data, []);
});
