import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import addColumns from "../../actions/add-columns.ts";

Deno.test("add-columns: POSTs a {columns:[…]} envelope", async () => {
  const { ctx, calls } = actionCtx([{ body: { columns: [{ id: "pet" }] } }]);
  const cols = [{ id: "pet", fields: { label: "Pet", type: "Text" } }];
  const out = await addColumns.execute!({ docId: "d", tableId: "T", columns: cols }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/T/columns");
  assertEquals(JSON.parse(calls[0].body!), { columns: cols });
  assertEquals(out.columns[0].id, "pet");
});

Deno.test("add-columns: passes widgetOptions through as the STRING Grist expects", async () => {
  const { ctx, calls } = actionCtx([{ body: { columns: [] } }]);
  const widgetOptions = '{"choices":["New","Old"]}';
  await addColumns.execute!(
    {
      docId: "d",
      tableId: "T",
      columns: [{ id: "Status", fields: { type: "Choice", widgetOptions } }],
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!).columns[0].fields.widgetOptions;
  assertEquals(typeof sent, "string");
  assertEquals(sent, widgetOptions);
});

Deno.test("add-columns: is non-idempotent — a repeat creates a suffixed column", () => {
  assertEquals(addColumns.idempotent, false);
});
