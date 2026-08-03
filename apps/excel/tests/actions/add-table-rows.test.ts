import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-table-rows.ts";

Deno.test("add-table-rows: POSTs to the table's /rows/add", async () => {
  const { ctx, calls } = mockCtx([{ body: { index: 6, values: [[1, 2, 3]] } }]);
  const out = await action.execute({
    itemId: "ITEM1",
    table: "Table1",
    values: [[1, 2, 3], [4, 5, 6]],
  }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/tables/Table1/rows/add",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { values: [[1, 2, 3], [4, 5, 6]] });
  assertEquals(out.index, 6);
});

Deno.test("add-table-rows: omits index entirely when appending to the end", async () => {
  // The API treats a missing index as "append"; sending `index: null` would be
  // a different request shape than sending none.
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", table: "Table1", values: [["a"]] }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { values: [["a"]] });
});

Deno.test("add-table-rows: sends a zero index rather than dropping it as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", table: "Table1", values: [["a"]], index: 0 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { values: [["a"]], index: 0 });
});

Deno.test("add-table-rows: batches many rows into one call", async () => {
  const rows = Array.from({ length: 50 }, (_, i) => [i, `row-${i}`]);
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", table: "Table1", values: rows }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(calls[0].body!).values.length, 50);
});

Deno.test("add-table-rows: resolves within a worksheet when one is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemPath: "Q3.xlsx",
    worksheet: "Sheet1",
    table: "Table1",
    values: [["a"]],
  }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Q3.xlsx:/workbook/worksheets/Sheet1/tables/Table1/rows/add",
  );
});

Deno.test("add-table-rows: refuses a call with no rows", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", table: "Table1", values: undefined }, ctx),
    Error,
    "Rows is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("add-table-rows: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemId: "ITEM1",
    table: "Table1",
    values: [["a"]],
    sessionId: "s1",
  }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("add-table-rows: is honestly non-idempotent — a retry appends twice", () => {
  assertEquals(action.idempotent, false);
});
