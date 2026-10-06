import { assertEquals, assertRejects } from "@std/assert";
import printjobCancel from "../../actions/printjob-cancel.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("printjob-cancel: DELETE /printjobs/{set} returns the cancelled ids", async () => {
  const { ctx, calls } = mockCtx([{ body: [623] }]);
  const out = await printjobCancel.execute({ printJobIds: "623,624" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/printjobs/623,624");
  assertEquals(out, { cancelled: [623] });
});

Deno.test("printjob-cancel: empty ids never builds the cancel-everything form", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await printjobCancel.execute({ printJobIds: "" }, ctx),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});
