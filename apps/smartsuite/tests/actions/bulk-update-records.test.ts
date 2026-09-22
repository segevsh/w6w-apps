import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-update-records.ts";

Deno.test("bulk-update-records: PATCHes { items } to records/bulk/", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    { tableId: "tbl1", items: [{ id: "rec1", status: "Closed" }] },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/bulk/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { items: [{ id: "rec1", status: "Closed" }] });
});

Deno.test("bulk-update-records: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
