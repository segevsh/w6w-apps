import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/search-sheet.ts";

test("search-sheet: is a search action requiring a sheet id and a query", () => {
  assertEquals(action.key, "search-sheet");
  assertEquals(action.type, "search");
  assertEquals(param(action, "sheetId").required, true);
  assertEquals(param(action, "query").required, true);
});

test("search-sheet: GETs /search/sheets/{id} with only the query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  await action.execute({ sheetId: "4583173393803140", query: "overdue" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/search/sheets/4583173393803140");
  assertEquals(url.searchParams.get("query"), "overdue");
  assertEquals([...url.searchParams.keys()], ["query"]);
});

test("search-sheet: exposes exactly the two params the operation declares", () => {
  // The operation declares only `query` — anything else would be invented.
  assertEquals((action.params ?? []).map((p) => p.key), ["sheetId", "query"]);
});

test("search-sheet: declares `results`, not `data`", () => {
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "results",
    "totalCount",
  ]);
});

test("search-sheet: says the rows are abbreviated and points at Get Row", () => {
  assert(/abbreviated/i.test(action.description!));
  assert(/Get Row/.test(action.description!));
});
