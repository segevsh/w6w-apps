import { assertEquals } from "@std/assert";
import recordDelete from "../../actions/record-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-delete: DELETEs .../records/{recordId} and reports deleted on a 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await recordDelete.execute(
    { databaseId: "db1", tableId: "tbl1", recordId: "rec1" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records/rec1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
});

Deno.test("record-delete: is marked idempotent — deleting twice is safe", () => {
  assertEquals(recordDelete.idempotent, true);
});
