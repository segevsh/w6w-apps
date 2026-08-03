import { assert, assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import listColumns from "../../actions/list-columns.ts";

Deno.test("list-columns: GETs the columns collection", async () => {
  const { ctx, calls } = actionCtx([{ body: { columns: [] } }]);
  await listColumns.execute!({ docId: "d", tableId: "People" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/People/columns");
  assert(!new URL(calls[0].url).searchParams.has("hidden"));
});

Deno.test("list-columns: hidden=true is forwarded, which is how manualSort appears", async () => {
  const { ctx, calls } = actionCtx([{ body: { columns: [] } }]);
  await listColumns.execute!({ docId: "d", tableId: "T", hidden: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("hidden"), "true");
});

Deno.test("list-columns: returns ids alongside labels — they are not the same thing", async () => {
  const { ctx } = actionCtx([{
    body: {
      columns: [
        { id: "pet", fields: { label: "Pet", type: "Text" } },
        { id: "popularity", fields: { label: "Popularity ❤", type: "Int" } },
      ],
    },
  }]);
  const out = await listColumns.execute!({ docId: "d", tableId: "T" }, ctx);
  assertEquals(out.columns?.map((c) => c.id), ["pet", "popularity"]);
  assertEquals(out.columns?.[1].fields.label, "Popularity ❤");
});
