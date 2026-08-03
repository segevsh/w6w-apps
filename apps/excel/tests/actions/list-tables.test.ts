import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tables.ts";

Deno.test("list-tables: lists the whole workbook's tables by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "2", name: "Table1" }] } }]);
  const out = await action.execute({ itemId: "ITEM1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/ITEM1/workbook/tables");
  assertEquals(out.value.length, 1);
});

Deno.test("list-tables: scopes to one worksheet when asked", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet15799" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet15799/tables",
  );
});

Deno.test("list-tables: a blank worksheet falls back to the workbook collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", worksheet: "   " }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/ITEM1/workbook/tables");
});

Deno.test("list-tables: pages with $top and $skip", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", top: 5, skip: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$top"), "5");
  assertEquals(url.searchParams.get("$skip"), "5");
});

Deno.test("list-tables: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemPath: "Q3.xlsx", sessionId: "s1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});
