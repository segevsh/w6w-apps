import { assertEquals } from "@std/assert";
import tableGet from "../../actions/table-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("table-get: calls GET /databases/{databaseId}/tables/{tableId}", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "tbl1", name: "Contacts", fields: [] }) },
  ]);
  const out = await tableGet.execute({ databaseId: "db1", tableId: "tbl1" }, ctx) as {
    id: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1");
  assertEquals(out.id, "tbl1");
});
