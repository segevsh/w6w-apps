import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-sheets.ts";

test("list-sheets: is a read over the sheet resource", () => {
  assertEquals(action.key, "list-sheets");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "sheet");
});

test("list-sheets: GETs /sheets with no query when nothing is supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets");
  assertEquals(new URL(calls[0].url).search, "");
});

test("list-sheets: sends include as ONE comma-separated param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ include: ["sheetVersion", "source"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include"), "sheetVersion,source");
  assertEquals(url.searchParams.getAll("include").length, 1);
});

test("list-sheets: offers only the two include values this endpoint declares", () => {
  // Get Sheet's 14-value list does not apply here; claiming it would produce
  // silently ignored params.
  assertEquals(optionValues(action, "include"), ["sheetVersion", "source"]);
});

test("list-sheets: passes modifiedSince and the paging trio", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute(
    { modifiedSince: "2026-08-01T00:00:00Z", page: 2, pageSize: 50, includeAll: true },
    ctx,
  );
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("modifiedSince"), "2026-08-01T00:00:00Z");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("pageSize"), "50");
  assertEquals(q.get("includeAll"), "true");
});

test("list-sheets: returns the IndexResult envelope unchanged", async () => {
  const body = { data: [{ id: 1, name: "Plan" }], totalCount: 1, pageNumber: 1, totalPages: 1 };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({}, ctx), body);
});

test("list-sheets: says the rows are not in this response", () => {
  assert(/Get Sheet/.test(action.description!));
});
