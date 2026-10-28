import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-table-rows.ts";

Deno.test("list-table-rows: GETs the table's rows collection", async () => {
  const { ctx, calls } = mockCtx([{
    body: { value: [{ index: 0, values: [[42019, 53, 34]] }] },
  }]);
  const out = await action.execute({ itemId: "ITEM1", table: "Table1" }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/tables/Table1/rows",
  );
  // Each row's `values` is a 2-D array holding one row — passed through as-is
  // so it matches the shape Add Table Rows expects.
  assertEquals(out.value[0].values, [[42019, 53, 34]]);
});

Deno.test("list-table-rows: accepts a numeric table id in the same position", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", table: "4" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/tables/4/rows",
  );
});

Deno.test("list-table-rows: resolves within a worksheet when one is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet15799", table: "table2" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet15799/tables/table2/rows",
  );
});

Deno.test("list-table-rows: pages with $top and $skip, per Microsoft's guidance", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", table: "Table1", top: 5, skip: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$top"), "5");
  assertEquals(url.searchParams.get("$skip"), "5");
});

Deno.test("list-table-rows: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", table: "Table1", sessionId: "s1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("list-table-rows: refuses an empty table identifier", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", table: "  " }, ctx),
    Error,
    "empty",
  );
});
