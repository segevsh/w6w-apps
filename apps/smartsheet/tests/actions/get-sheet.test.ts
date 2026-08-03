import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/get-sheet.ts";

Deno.test("get-sheet: is a read over the sheet resource and requires a sheet id", () => {
  assertEquals(action.key, "get-sheet");
  assertEquals(action.type, "read");
  assertEquals(param(action, "sheetId").required, true);
});

Deno.test("get-sheet: GETs /sheets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({ sheetId: "4583173393803140" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets/4583173393803140");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-sheet: offers exactly the 14 include values the API declares", () => {
  assertEquals(optionValues(action, "include"), [
    "attachments",
    "columnType",
    "crossSheetReferences",
    "discussions",
    "filters",
    "filterDefinitions",
    "format",
    "ganttConfig",
    "objectValue",
    "ownerInfo",
    "proofs",
    "rowPermalink",
    "source",
    "writerInfo",
  ]);
});

Deno.test("get-sheet: offers exactly the 4 exclude values the API declares", () => {
  assertEquals(optionValues(action, "exclude"), [
    "filteredOutRows",
    "linkInFromCellDetails",
    "linksOutToCellsDetails",
    "nonexistentCells",
  ]);
});

Deno.test("get-sheet: warns that nonexistentCells makes the cells array sparse", () => {
  // This is the flag that breaks positional cell reading, so the warning has to
  // be on the param and not buried in a README.
  assert(/columnId/.test(param(action, "exclude").hint ?? ""));
});

Deno.test("get-sheet: sends include and exclude as single comma-separated params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    { sheetId: "1", include: ["columnType", "objectValue"], exclude: ["nonexistentCells"] },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("include"), "columnType,objectValue");
  assertEquals(q.get("exclude"), "nonexistentCells");
});

Deno.test("get-sheet: forwards the row/column narrowing params verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    sheetId: "1",
    columnIds: "4567890123,1234567890",
    rowIds: "8896508249565060",
    rowNumbers: "1,2,3",
    rowsModifiedSince: "2026-08-01T00:00:00Z",
    level: 2,
    page: 3,
    pageSize: 25,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("columnIds"), "4567890123,1234567890");
  assertEquals(q.get("rowIds"), "8896508249565060");
  assertEquals(q.get("rowNumbers"), "1,2,3");
  assertEquals(q.get("rowsModifiedSince"), "2026-08-01T00:00:00Z");
  assertEquals(q.get("level"), "2");
  assertEquals(q.get("page"), "3");
  assertEquals(q.get("pageSize"), "25");
});

Deno.test("get-sheet: level 0 is sent, because 0 is a real value and not an absence", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ sheetId: "1", level: 0 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("level"), "0");
});

Deno.test("get-sheet: url-encodes the sheet id rather than interpolating it raw", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ sheetId: "a/b" }, ctx);
  assert(calls[0].url.includes("/sheets/a%2Fb"));
});

Deno.test("get-sheet: declares rows and columns in its output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assert(keys.includes("rows"));
  assert(keys.includes("columns"));
});
