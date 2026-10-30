import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-update-records.ts";

test("bulk-update-records: PATCHes { items } to records/bulk/", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    { tableId: "tbl1", items: [{ id: "rec1", status: "Closed" }] },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/bulk/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { items: [{ id: "rec1", status: "Closed" }] });
});

test("bulk-update-records: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
