import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-table.ts";

Deno.test("add-table: POSTs to /tables/add — not the overview's /tables/{id}/add typo", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "2", name: "Table1" } }]);
  const out = await action.execute({ itemId: "ITEM1", address: "Sheet1!A1:D5" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/ITEM1/workbook/tables/add");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { address: "Sheet1!A1:D5", hasHeaders: true });
  assertEquals(out.name, "Table1");
});

Deno.test("add-table: pins to a worksheet's collection when one is named", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "A1:D5" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/tables/add",
  );
});

Deno.test("add-table: sends hasHeaders false when the data has no header row", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", address: "A1:D5", hasHeaders: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).hasHeaders, false);
});

Deno.test("add-table: works under the path form and forwards the session", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemPath: "Q3.xlsx", address: "Sheet1!A1:B2", sessionId: "s1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Q3.xlsx:/workbook/tables/add",
  );
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("add-table: is honestly non-idempotent — a retry overlaps or duplicates", () => {
  assertEquals(action.idempotent, false);
});
