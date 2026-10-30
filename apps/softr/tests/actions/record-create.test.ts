import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import recordCreate from "../../actions/record-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("record-create: POSTs {fields} to .../records", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "rec1", tableId: "tbl1", fields: { Name: "Acme" } }) },
  ]);
  const out = await recordCreate.execute(
    { databaseId: "db1", tableId: "tbl1", fields: { Name: "Acme" } },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/api/v1/databases/db1/tables/tbl1/records");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { fields: { Name: "Acme" } });
  assertEquals(out.id, "rec1");
});

test("record-create: is explicitly not idempotent — retrying creates a duplicate", () => {
  assertEquals(recordCreate.idempotent, false);
});

test("record-create: a missing fields object sends an empty one rather than throwing", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "rec1", fields: {} }) }]);
  await recordCreate.execute(
    { databaseId: "db1", tableId: "tbl1", fields: undefined as unknown as Record<string, unknown> },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { fields: {} });
});
