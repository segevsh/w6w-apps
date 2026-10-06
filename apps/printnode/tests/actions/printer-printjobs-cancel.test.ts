import { assertEquals, assertRejects } from "@std/assert";
import cancel from "../../actions/printer-printjobs-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("printer-printjobs-cancel: DELETE /printers/{set}/printjobs", async () => {
  const { ctx, calls } = mockCtx([{ body: [1, 2] }]);
  const out = await cancel.execute({ printerIds: "34" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/printers/34/printjobs");
  assertEquals(out, { cancelled: [1, 2] });
});

Deno.test("printer-printjobs-cancel: job ids narrow the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [5] }]);
  await cancel.execute({ printerIds: "34,36", printJobIds: "5,6" }, ctx);
  assertEquals(pathOf(calls[0].url), "/printers/34,36/printjobs/5,6");
});

Deno.test("printer-printjobs-cancel: printer ids are required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await cancel.execute({ printerIds: "" }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});
