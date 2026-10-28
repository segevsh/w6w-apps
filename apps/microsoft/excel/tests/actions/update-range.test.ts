import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-range.ts";

Deno.test("update-range: PATCHes the range function path with the values grid", async () => {
  const { ctx, calls } = mockCtx([{ body: { address: "Sheet1!A1:B2" } }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    address: "A1:B2",
    values: [["Test", "Value"], ["For", "Update"]],
  }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/range(address='A1:B2')",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    values: [["Test", "Value"], ["For", "Update"]],
  });
});

Deno.test("update-range: combines values, formulas and number formats in one call", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    address: "A1:B2",
    values: [["Hello", "100"], ["1/1/2016", null]],
    formulas: [[null, null], [null, "=B1*2"]],
    numberFormat: [[null, null], ["m-ddd", null]],
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  // `null` inside a grid means "skip this cell" and must survive serialisation.
  assertEquals(body.values[1][1], null);
  assertEquals(body.formulas[1][1], "=B1*2");
  assertEquals(body.numberFormat[1][0], "m-ddd");
});

Deno.test("update-range: preserves a single-cell grid, which Excel fills across the range", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    address: "A1:B100",
    values: [["Sample text"]],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { values: [["Sample text"]] });
});

Deno.test("update-range: refuses a PATCH with nothing to write", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", address: "A1" }, ctx),
    Error,
    "Nothing to write",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-range: works under the path form and forwards the session", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    itemPath: "Reports/Q3.xlsx",
    worksheet: "Sheet1",
    address: "A1",
    values: [["x"]],
    sessionId: "s1",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/drive/root:/Reports/Q3.xlsx:/workbook/worksheets/Sheet1/range(address='A1')",
  );
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("update-range: declares the address required — unbounded writes are rejected by Graph", () => {
  assertEquals(action.params?.find((p) => p.key === "address")?.required, true);
});
