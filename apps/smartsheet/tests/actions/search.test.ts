import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/search.ts";

Deno.test("search: is a search action and requires a query", () => {
  assertEquals(action.key, "search");
  assertEquals(action.type, "search");
  assertEquals(param(action, "query").required, true);
});

Deno.test("search: GETs /search with the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  await action.execute({ query: '"Q3 budget"' }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/search");
  assertEquals(new URL(calls[0].url).searchParams.get("query"), '"Q3 budget"');
});

Deno.test("search: sends scopes and include as single comma-separated params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }]);
  await action.execute({
    query: "x",
    scopes: ["cellData", "sheetNames"],
    include: ["favoriteFlag"],
    modifiedSince: "2026-08-01T00:00:00Z",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("scopes"), "cellData,sheetNames");
  assertEquals(q.get("include"), "favoriteFlag");
  assertEquals(q.get("modifiedSince"), "2026-08-01T00:00:00Z");
});

Deno.test("search: offers the ten scope values the API declares", () => {
  assertEquals(optionValues(action, "scopes"), [
    "attachments",
    "cellData",
    "comments",
    "folderNames",
    "reportNames",
    "sheetNames",
    "sightNames",
    "summaryFields",
    "templateNames",
    "workspaceNames",
  ]);
});

Deno.test("search: does NOT expose the deprecated location param", () => {
  assertEquals((action.params ?? []).some((p) => p.key === "location"), false);
});

Deno.test("search: is not paginated, because this operation declares no paging params", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  for (const k of ["page", "pageSize", "includeAll"]) assertEquals(keys.includes(k), false);
});

Deno.test("search: declares `results`, NOT `data` — the envelope differs from every other list", () => {
  const keys = (action.output as Array<{ key: string; label: string }>).map((o) => o.key);
  assertEquals(keys, ["results", "totalCount"]);
  const results = (action.output as Array<{ key: string; label: string }>)[0];
  assert(/NOT `data`/.test(results.label));
});

Deno.test("search: returns the search envelope unchanged", async () => {
  const body = { results: [{ objectType: "row", objectId: 1 }], totalCount: 1 };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({ query: "x" }, ctx), body);
});

Deno.test("search: warns that the index is not read-your-writes", () => {
  assert(/index/i.test(action.description!));
});
