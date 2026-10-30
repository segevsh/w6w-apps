import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bulk-add-records.ts";

test("bulk-add-records: POSTs { items } to records/bulk/", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "rec1" }] } }]);
  const result = await action.execute!(
    { tableId: "tbl1", items: [{ name: "A" }, { name: "B" }] },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/bulk/");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { items: [{ name: "A" }, { name: "B" }] });
  assertEquals(result, { items: [{ id: "rec1" }] });
});

test("bulk-add-records: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
