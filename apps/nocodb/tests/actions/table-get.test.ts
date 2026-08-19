import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/table-get.ts";

const D = { display: { host: "https://nocodb.internal" } };
const table = {
  status: 200,
  body: {
    id: "mtbl1",
    title: "Orders",
    columns: [
      { id: "c1", title: "Id", uidt: "ID", pk: true },
      { id: "c2", title: "Title", uidt: "SingleLineText" },
      {
        id: "c3",
        title: "Status",
        uidt: "SingleSelect",
        colOptions: { options: [{ title: "New" }, { title: "Done" }] },
      },
      { id: "c4", title: "Total", uidt: "Formula" },
      { id: "c5", title: "Items", uidt: "LinkToAnotherRecord" },
      { id: "c6", title: "CreatedAt", uidt: "DateTime", system: true },
    ],
  },
};

/** A formula is rejected in terms of the column rather than the rule. */
Deno.test("table-get: separates writable columns from computed ones", async () => {
  const { ctx, calls } = mockCtx([table], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/meta/tables/mtbl1");
  assertEquals(result.writableColumns, ["Title", "Status"]);
  assertEquals(result.computedColumns, ["Total"]);
});

/** The link actions take the field's id, and everybody has the title. */
Deno.test("table-get: reports the link field ids", async () => {
  const { ctx } = mockCtx([table], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.linkFields, [{ id: "c5", title: "Items" }]);
});

Deno.test("table-get: reports the values a select column will accept", async () => {
  const { ctx } = mockCtx([table], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.selectOptions, { Status: ["New", "Done"] });
});

/** A base built on an existing database may key on something else. */
Deno.test("table-get: reports the primary key column, defaulting to Id", async () => {
  const { ctx } = mockCtx([table], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(result.primaryKey, "Id");

  const custom = mockCtx([{
    status: 200,
    body: { columns: [{ title: "sku", uidt: "SingleLineText", pk: true }] },
  }], D);
  const other = await action.execute({ tableId: "mtbl1" }, custom.ctx) as Record<string, unknown>;
  assertEquals(other.primaryKey, "sku");
});

Deno.test("table-get: requires a table id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`tableId` is required");
});
