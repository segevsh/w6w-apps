import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { actionCtx } from "../_helpers.ts";
import action from "../../actions/update-records.ts";

test("update-records: PATCHes the records collection", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!(
    { docId: "d", tableId: "People", records: [{ id: 1, fields: { pet: "cat" } }] },
    ctx,
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/People/records");
  assertEquals(JSON.parse(calls[0].body!), { records: [{ id: 1, fields: { pet: "cat" } }] });
});

test("update-records: forwards a null field value rather than dropping it", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!(
    { docId: "d", tableId: "T", records: [{ id: 1, fields: { note: null } }] },
    ctx,
  );
  // null is how a column is cleared — collapsing it to "omit" would silently no-op.
  assertEquals(JSON.parse(calls[0].body!).records[0].fields, { note: null });
});

test("update-records: echoes the ids, because Grist answers with an empty body", async () => {
  const { ctx } = actionCtx([{ status: 200, body: "" }]);
  const out = await action.execute!(
    { docId: "d", tableId: "T", records: [{ id: 4, fields: {} }, { id: 9, fields: {} }] },
    ctx,
  );
  assertEquals(out.records, [{ id: 4 }, { id: 9 }]);
});

test("update-records: sends noparse when set", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "T", records: [], noparse: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("noparse"), "true");
});

test("update-records: is idempotent — the same patch converges", () => {
  assertEquals(action.idempotent, true);
});
