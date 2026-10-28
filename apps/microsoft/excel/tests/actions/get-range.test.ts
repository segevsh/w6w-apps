import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-range.ts";

Deno.test("get-range: builds the range(address='…') function path", async () => {
  const { ctx, calls } = mockCtx([{ body: { address: "Sheet1!A1:B2", values: [["a", "b"]] } }]);
  const out = await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "A1:B2" }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/range(address='A1:B2')",
  );
  assertEquals(out.address, "Sheet1!A1:B2");
});

Deno.test("get-range: keeps a sheet-qualified address inside the function parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "Sheet1!A1:B2" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/range(address='Sheet1!A1:B2')",
  );
});

Deno.test("get-range: falls back to the bare /range when no address is given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1" }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/range",
  );
});

Deno.test("get-range: doubles an apostrophe in a quoted sheet name", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "'Bob''s'!A1" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname).split("range")[1],
    "(address='''Bob''''s''!A1')",
  );
});

Deno.test("get-range: passes $select through so a big range can be trimmed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    address: "A1:Z999",
    select: ["values", "address"],
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "values,address");
});

Deno.test("get-range: forwards the session header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", sessionId: "s1" }, ctx);
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("get-range: refuses an unaddressed workbook", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ worksheet: "Sheet1" }, ctx),
    Error,
    "must be addressed",
  );
});
