import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import printerGet from "../../actions/printer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("printer-get: GET /printers/{set}", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 34 }] }]);
  await printerGet.execute({ printerIds: 34 }, ctx);
  assertEquals(pathOf(calls[0].url), "/printers/34");
});

test("printer-get: computer ids use the nested path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await printerGet.execute({ printerIds: "34,36", computerIds: "12" }, ctx);
  assertEquals(pathOf(calls[0].url), "/computers/12/printers/34,36");
});

test("printer-get: printer ids are required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await printerGet.execute({ printerIds: "" }, ctx),
    Error,
    "required",
  );
});
