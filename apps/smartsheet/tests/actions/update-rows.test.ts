import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/update-rows.ts";

const ok = () => mockCtx([{ status: 200, body: { message: "SUCCESS", result: [] } }]);

Deno.test("update-rows: is an idempotent perform over the row resource", () => {
  assertEquals(action.key, "update-rows");
  assertEquals(action.type, "perform");
  // Absolute assignments keyed by row id converge on replay.
  assertEquals(action.idempotent, true);
});

Deno.test("update-rows: PUTs to /sheets/{id}/rows with the row id in the body", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "4583173393803140",
    rowId: "8896508249565060",
    cells: { "7960873114331012": "Done" },
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets/4583173393803140/rows");
  assertEquals(JSON.parse(calls[0].body!), [{
    id: 8896508249565060,
    cells: [{ columnId: 7960873114331012, value: "Done" }],
  }]);
});

Deno.test("update-rows: an empty-string value survives, because it CLEARS the cell", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowId: "2", cells: { "3": "" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!)[0].cells, [{ columnId: 3, value: "" }]);
});

Deno.test("update-rows: omitting cells entirely sends no cells key, leaving values alone", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowId: "2", locked: true }, ctx);
  const row = JSON.parse(calls[0].body!)[0];
  assertEquals(row, { id: 2, locked: true });
  assertEquals("cells" in row, false);
});

Deno.test("update-rows: an empty cells map sends an empty cells array, not a missing key", async () => {
  // `{}` is an explicit "no cell changes" from the caller; it is representable
  // and distinct from omitting the param.
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowId: "2", cells: {} }, ctx);
  assertEquals(JSON.parse(calls[0].body!)[0].cells, []);
});

Deno.test("update-rows: indent and outdent are sent as the literal 1 the API requires", async () => {
  const a = ok();
  await action.execute({ sheetId: "1", rowId: "2", indent: true }, a.ctx);
  assertEquals(JSON.parse(a.calls[0].body!)[0].indent, 1);

  const b = ok();
  await action.execute({ sheetId: "1", rowId: "2", outdent: true }, b.ctx);
  assertEquals(JSON.parse(b.calls[0].body!)[0].outdent, 1);
});

Deno.test("update-rows: false indent/outdent are omitted, not sent as 0", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowId: "2", indent: false, outdent: false }, ctx);
  const row = JSON.parse(calls[0].body!)[0];
  assertEquals("indent" in row, false);
  assertEquals("outdent" in row, false);
});

Deno.test("update-rows: warns that indent/outdent are relative and break replay", () => {
  assert(/RELATIVE|relative/.test(param(action, "indent").hint ?? ""));
  assert(/relative/i.test(param(action, "outdent").hint ?? ""));
});

Deno.test("update-rows: locked and expanded pass straight through", async () => {
  const { ctx, calls } = ok();
  await action.execute({ sheetId: "1", rowId: "2", locked: false, expanded: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!)[0], { id: 2, locked: false, expanded: true });
});

Deno.test("update-rows: bulk rows each carry their own id and cells", async () => {
  const { ctx, calls } = ok();
  await action.execute({
    sheetId: "1",
    rows: [
      { id: "10", cells: { "3": "a" } },
      { id: 11, cells: [{ columnId: 3, value: "b", strict: false }] },
    ],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), [
    { id: 10, cells: [{ columnId: 3, value: "a" }] },
    { id: 11, cells: [{ columnId: 3, value: "b", strict: false }] },
  ]);
});

Deno.test("update-rows: a bulk row without an id is refused", () => {
  const { ctx } = ok();
  const err = assertThrows(
    () => action.execute({ sheetId: "1", rows: [{ cells: { "3": "a" } }] }, ctx),
    Error,
  );
  assert(err.message.includes("missing id"));
});

Deno.test("update-rows: rowId is required when no bulk rows are given", () => {
  const { ctx } = ok();
  assertThrows(() => action.execute({ sheetId: "1", cells: { "3": "a" } }, ctx), Error, "rowId");
});

Deno.test("update-rows: a row id that would round is refused, not silently corrupted", () => {
  const { ctx } = ok();
  assertThrows(
    () => action.execute({ sheetId: "1", rowId: "90071992547409911" }, ctx),
    Error,
    "safe integer",
  );
});

Deno.test("update-rows: sends the bulk flags only when asked for", async () => {
  const a = ok();
  await action.execute({ sheetId: "1", rowId: "2" }, a.ctx);
  assertEquals(new URL(a.calls[0].url).search, "");

  const b = ok();
  await action.execute(
    { sheetId: "1", rowId: "2", allowPartialSuccess: true, overrideValidation: true },
    b.ctx,
  );
  const q = new URL(b.calls[0].url).searchParams;
  assertEquals(q.get("allowPartialSuccess"), "true");
  assertEquals(q.get("overrideValidation"), "true");
});
