import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-workbooks.ts";

Deno.test("list-workbooks: searches the drive root with the default .xlsx query", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/me/drive/root/search(q='.xlsx')");
});

Deno.test("list-workbooks: escapes an apostrophe in the query, per OData", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ query: "Bob's budget" }, ctx);
  assert(
    decodeURIComponent(new URL(calls[0].url).pathname).includes("q='Bob''s budget'"),
    calls[0].url,
  );
});

Deno.test("list-workbooks: maps $select, $orderby and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ select: ["id", "name"], orderby: "name asc", top: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "id,name");
  assertEquals(url.searchParams.get("$orderby"), "name asc");
  assertEquals(url.searchParams.get("$top"), "5");
});

Deno.test("list-workbooks: filters non-workbooks out of the page by default", async () => {
  const { ctx } = mockCtx([{
    body: {
      value: [
        { id: "1", name: "Q3.xlsx" },
        { id: "2", name: "Q3 notes.docx" },
        { id: "3", name: "macros.xlsm" },
        { id: "4", name: "legacy.xls" },
        { id: "5" },
      ],
    },
  }]);
  const out = await action.execute({}, ctx);
  // `.xls` is excluded deliberately: the Excel REST API supports only Office
  // Open XML workbooks.
  assertEquals(out.value.map((i) => i.id), ["1", "3"]);
});

Deno.test("list-workbooks: returns everything when the filter is turned off", async () => {
  const { ctx } = mockCtx([{
    body: { value: [{ id: "1", name: "Q3.xlsx" }, { id: "2", name: "notes.docx" }] },
  }]);
  const out = await action.execute({ xlsxOnly: false }, ctx);
  assertEquals(out.value.length, 2);
});

Deno.test("list-workbooks: replays a nextLink verbatim instead of rebuilding the query", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, top: 999, query: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-workbooks: follows every page when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a", name: "a.xlsx" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b", name: "b.xlsx" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
  assertEquals(out.pages, 2);
});

Deno.test("list-workbooks: honours maxPages and hands back the cursor", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/search(q='x')?$skiptoken=1";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a", name: "a.xlsx" }], "@odata.nextLink": next } },
  ]);
  const out = await action.execute({ all: true, maxPages: 1 }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.nextLink, next);
});
