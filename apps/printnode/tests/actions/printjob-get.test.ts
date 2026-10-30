import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import printjobGet from "../../actions/printjob-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("printjob-get: GET /printjobs/{set}", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 623 }] }]);
  await printjobGet.execute({ printJobIds: "623" }, ctx);
  assertEquals(pathOf(calls[0].url), "/printjobs/623");
});

test("printjob-get: printer ids use the nested path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await printjobGet.execute({ printJobIds: "1,2", printerIds: "34" }, ctx);
  assertEquals(pathOf(calls[0].url), "/printers/34/printjobs/1,2");
});

test("printjob-get: ids are required", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await printjobGet.execute({ printJobIds: "" }, ctx),
    Error,
    "required",
  );
});
