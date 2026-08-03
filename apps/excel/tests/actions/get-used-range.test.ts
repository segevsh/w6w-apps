import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-used-range.ts";

Deno.test("get-used-range: defaults to valuesOnly, so stray formatting cannot inflate it", async () => {
  const { ctx, calls } = mockCtx([{ body: { address: "Sheet1!A1:C9" } }]);
  const out = await action.execute({ itemId: "ITEM1", worksheet: "Sheet1" }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/usedRange(valuesOnly=true)",
  );
  assertEquals(out.address, "Sheet1!A1:C9");
});

Deno.test("get-used-range: emits the bare usedRange when valuesOnly is turned off", async () => {
  // Graph's own default — formatting counts as "used".
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", valuesOnly: false }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/usedRange",
  );
});

Deno.test("get-used-range: valuesOnly is a path function parameter, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("valuesOnly"), false);
});

Deno.test("get-used-range: works under the path form with an encoded worksheet id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemPath: "Q3 Reports/Summary.xlsx",
    worksheet: "{00000000-0001-0000-0000-000000000000}",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Q3%20Reports/Summary.xlsx:/workbook/worksheets/" +
      "%7B00000000-0001-0000-0000-000000000000%7D/usedRange(valuesOnly=true)",
  );
});

Deno.test("get-used-range: passes $select through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", select: ["values"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "values");
});

Deno.test("get-used-range: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", sessionId: "s1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});
