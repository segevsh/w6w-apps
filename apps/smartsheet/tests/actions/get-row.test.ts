import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/get-row.ts";

Deno.test("get-row: is a read over the row resource", () => {
  assertEquals(action.key, "get-row");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "row");
  assertEquals(param(action, "sheetId").required, true);
  assertEquals(param(action, "rowId").required, true);
});

Deno.test("get-row: GETs /sheets/{sheetId}/rows/{rowId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({ sheetId: "4583173393803140", rowId: "8896508249565060" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/2.0/sheets/4583173393803140/rows/8896508249565060",
  );
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("get-row: offers only the two include values THIS endpoint declares", () => {
  // Get Sheet's 14-value list does not apply to the row endpoint.
  assertEquals(optionValues(action, "include"), ["columns", "filters"]);
});

Deno.test("get-row: sends include and exclude as single comma-separated params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    sheetId: "1",
    rowId: "2",
    include: ["columns", "filters"],
    exclude: ["nonexistentCells"],
    level: 1,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("include"), "columns,filters");
  assertEquals(q.get("exclude"), "nonexistentCells");
  assertEquals(q.get("level"), "1");
});

Deno.test("get-row: points at include=columns, the only way to decode cell ids in one call", () => {
  assert(/columns/.test(action.description!));
  assert(/columnId/i.test(action.description!));
});

Deno.test("get-row: declares cells in its output and names the columnId keying", () => {
  const cells = (action.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "cells")!;
  assert(/columnId/.test(cells.label));
});
