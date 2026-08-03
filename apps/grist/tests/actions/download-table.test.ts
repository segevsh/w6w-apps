import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import downloadTable from "../../actions/download-table.ts";

Deno.test("download-table: GETs /download/csv with tableId and a colId header", async () => {
  const { ctx, calls } = actionCtx([
    { body: "pet,popularity\ncat,67\n", headers: { "content-type": "text/csv" } },
  ]);
  const out = await downloadTable.execute!({ docId: "d", tableId: "People" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/docs/d/download/csv");
  assertEquals(url.searchParams.get("tableId"), "People");
  assertEquals(url.searchParams.get("header"), "colId");
  // The body is returned verbatim — not run through JSON.parse.
  assertEquals(out.format, "csv");
  assertEquals(out.content, "pet,popularity\ncat,67\n");
});

Deno.test("download-table: tsv switches the path, and header=label is forwarded", async () => {
  const { ctx, calls } = actionCtx([
    { body: "pet\tpopularity\n", headers: { "content-type": "text/tab-separated-values" } },
  ]);
  const out = await downloadTable.execute!(
    { docId: "d", tableId: "T", format: "tsv", header: "label" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/download/tsv");
  assertEquals(new URL(calls[0].url).searchParams.get("header"), "label");
  assertEquals(out.format, "tsv");
});

Deno.test("download-table: offers only csv and tsv — dsv has no delimiter parameter", () => {
  const p = downloadTable.params!.find((p) => p.key === "format")!;
  assertEquals((p.options as Array<{ value: string }>).map((o) => o.value), ["csv", "tsv"]);
});
