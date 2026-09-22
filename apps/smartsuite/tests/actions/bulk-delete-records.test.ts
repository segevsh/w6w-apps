import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-delete-records.ts";

Deno.test("bulk-delete-records: PATCHes { items } to records/bulk_delete/ with ?fields=id", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  const result = await action.execute!({ tableId: "tbl1", items: ["rec1", "rec2"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/applications/tbl1/records/bulk_delete/");
  assertEquals(url.searchParams.get("fields"), "id");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { items: ["rec1", "rec2"] });
  assertEquals(result, { deleted: true });
});

Deno.test("bulk-delete-records: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
