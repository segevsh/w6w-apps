import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-worksheets.ts";

Deno.test("list-worksheets: GETs the worksheets collection under the item-id form", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "{S1}", name: "Sheet1" }] } }]);
  const out = await action.execute({ itemId: "ITEM1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/drive/items/ITEM1/workbook/worksheets");
  assertEquals(out.value.length, 1);
  assertEquals(out.pages, 1);
});

Deno.test("list-worksheets: GETs the worksheets collection under the path form", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemPath: "Reports/Q3 Summary.xlsx" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Reports/Q3%20Summary.xlsx:/workbook/worksheets",
  );
});

Deno.test("list-worksheets: pages with $top and $skip — Excel collections have no cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", top: 10, skip: 20, select: ["id", "name"] }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$top"), "10");
  assertEquals(url.searchParams.get("$skip"), "20");
  assertEquals(url.searchParams.get("$select"), "id,name");
});

Deno.test("list-worksheets: forwards the session header when one is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1", sessionId: "sess-9" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "sess-9");
});

Deno.test("list-worksheets: sends no session header when running sessionless", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ itemId: "ITEM1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], undefined);
});

Deno.test("list-worksheets: refuses an unaddressed workbook", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "must be addressed");
});
