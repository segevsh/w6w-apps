import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import listTables from "../../actions/list-tables.ts";

Deno.test("list-tables: GETs the tables collection with no expand by default", async () => {
  const { ctx, calls } = actionCtx([{ body: { tables: [] } }]);
  await listTables.execute!({ docId: "9PJhBDZ" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/docs/9PJhBDZ/tables");
  assert(!url.searchParams.has("expand"));
});

Deno.test("list-tables: expand:true becomes Grist's literal expand=column", async () => {
  const { ctx, calls } = actionCtx([{ body: { tables: [] } }]);
  await listTables.execute!({ docId: "d", expand: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("expand"), "column");
});

Deno.test("list-tables: expand:false sends nothing, since 'false' is not a legal value", async () => {
  const { ctx, calls } = actionCtx([{ body: { tables: [] } }]);
  await listTables.execute!({ docId: "d", expand: false }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("expand"));
});

Deno.test("list-tables: returns table ids and inline columns when expanded", async () => {
  const { ctx } = actionCtx([{
    body: {
      tables: [{
        id: "People",
        fields: { tableRef: 1, onDemand: false },
        columns: [{ id: "Name", fields: { type: "Text", label: "Name" } }],
      }],
    },
  }]);
  const out = await listTables.execute!({ docId: "d", expand: true }, ctx);
  assertEquals(out.tables[0].id, "People");
  assertEquals(out.tables[0].columns?.[0].id, "Name");
});
