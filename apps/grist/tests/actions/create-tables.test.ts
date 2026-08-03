import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import createTables from "../../actions/create-tables.ts";

Deno.test("create-tables: POSTs a {tables:[…]} envelope", async () => {
  const { ctx, calls } = actionCtx([{ body: { tables: [{ id: "People" }] } }]);
  const spec = [{ id: "People", columns: [{ id: "pet", fields: { label: "Pet" } }] }];
  const out = await createTables.execute!({ docId: "d", tables: spec }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables");
  assertEquals(JSON.parse(calls[0].body!), { tables: spec });
  assertEquals(out.tables[0].id, "People");
});

Deno.test("create-tables: returns the id Grist ASSIGNED, which may differ from the request", async () => {
  const { ctx } = actionCtx([{ body: { tables: [{ id: "My_Table2" }] } }]);
  const out = await createTables.execute!(
    { docId: "d", tables: [{ id: "My Table", columns: [{ id: "a" }] }] },
    ctx,
  );
  assertEquals(out.tables[0].id, "My_Table2");
});

Deno.test("create-tables: is non-idempotent — a repeat creates a suffixed table", () => {
  assertEquals(createTables.idempotent, false);
});
