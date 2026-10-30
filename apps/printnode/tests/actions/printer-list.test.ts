import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import printerList from "../../actions/printer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("printer-list: GET /printers by default", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 34, name: "P" }] }]);
  const out = await printerList.execute({ limit: 10 }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/printers");
  assertEquals(queryOf(calls[0].url), { limit: "10" });
  assertEquals(out.count, 1);
});

test("printer-list: computer ids scope the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await printerList.execute({ computerIds: "12,13" }, ctx);
  assertEquals(pathOf(calls[0].url), "/computers/12,13/printers");
});

test("printer-list: bad computer ids are refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await printerList.execute({ computerIds: "x" }, ctx), Error);
});
