import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-record.ts";

test("update-record: PATCHes the partial record to records/{recordId}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1" } }]);
  const result = await action.execute!(
    { tableId: "tbl1", recordId: "rec1", fields: { status: "Closed" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/rec1/");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { status: "Closed" });
  assertEquals(result, { id: "rec1" });
});

test("update-record: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
