import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/list-columns.ts";

test("list-columns: is a read over the column resource", () => {
  assertEquals(action.key, "list-columns");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "column");
  assertEquals(param(action, "sheetId").required, true);
});

test("list-columns: GETs /sheets/{id}/columns", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ sheetId: "4583173393803140" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/sheets/4583173393803140/columns");
  assertEquals(new URL(calls[0].url).search, "");
});

test("list-columns: forwards level and the paging trio", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ sheetId: "1", level: 2, page: 2, pageSize: 10, includeAll: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("level"), "2");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("pageSize"), "10");
  assertEquals(q.get("includeAll"), "true");
});

test("list-columns: is described as the id lookup every cell write depends on", () => {
  assert(/column ID/i.test(action.description!));
});

test("list-columns: returns the IndexResult envelope unchanged", async () => {
  const body = {
    data: [{ id: 7960873114331012, title: "Task", type: "TEXT_NUMBER", index: 0, primary: true }],
    totalCount: 1,
  };
  const { ctx } = mockCtx([{ status: 200, body }]);
  assertEquals(await action.execute({ sheetId: "1" }, ctx), body);
});
