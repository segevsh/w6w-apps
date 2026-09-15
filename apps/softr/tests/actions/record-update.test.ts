import { assertEquals } from "@std/assert";
import recordUpdate from "../../actions/record-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-update: PATCHes {fields} to .../records/{recordId}", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "rec1", tableId: "tbl1", fields: { Name: "Acme Inc." } }) },
  ]);
  const out = await recordUpdate.execute(
    { databaseId: "db1", tableId: "tbl1", recordId: "rec1", fields: { Name: "Acme Inc." } },
    ctx,
  ) as { fields: Record<string, unknown> };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records/rec1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { fields: { Name: "Acme Inc." } });
  assertEquals(out.fields, { Name: "Acme Inc." });
});

/** Reapplying the same field values leaves the record in the same state. */
Deno.test("record-update: is marked idempotent", () => {
  assertEquals(recordUpdate.idempotent, true);
});
