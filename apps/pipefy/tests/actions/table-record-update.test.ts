import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import tableRecordUpdate from "../../actions/table-record-update.ts";

test("table-record-update: renames a record", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { updateTableRecord: { table_record: { id: "1", title: "New title" } } } },
  }]);
  const out = await tableRecordUpdate.execute({ id: "1", title: "New title" }, ctx) as {
    title: string;
  };
  assertEquals(out.title, "New title");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("mutation { updateTableRecord(input: { id: 1, title:"));
});

test("table-record-update: type/resource/idempotency metadata", () => {
  assertEquals(tableRecordUpdate.type, "perform");
  assertEquals(tableRecordUpdate.resource, "table-record");
  assertEquals(tableRecordUpdate.idempotent, true);
});
