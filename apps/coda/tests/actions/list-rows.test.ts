import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-rows.ts";

Deno.test("list-rows: GETs rows with query, sort and pagination params", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({
    docId: "doc-1",
    tableId: "grid-1",
    query: '"Status":"Done"',
    sortBy: "createdAt",
    useColumnNames: false,
    valueFormat: "rich",
    visibleOnly: true,
    limit: 50,
    pageToken: "cur-1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/apis/v1/docs/doc-1/tables/grid-1/rows");
  assertEquals(url.searchParams.get("query"), '"Status":"Done"');
  assertEquals(url.searchParams.get("sortBy"), "createdAt");
  assertEquals(url.searchParams.get("useColumnNames"), "false");
  assertEquals(url.searchParams.get("valueFormat"), "rich");
  assertEquals(url.searchParams.get("visibleOnly"), "true");
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("pageToken"), "cur-1");
});

Deno.test("list-rows: defaults useColumnNames to true", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ docId: "doc-1", tableId: "grid-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("useColumnNames"), "true");
});
