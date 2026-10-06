import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/qr-validate.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("qr-validate: success maps to valid:true", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, errors: [], warnings: [], normalized: { size: 300 } },
  }]);
  const out = await exec(action, { text: "x", size: 300 }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/api/validate-qr");
  assertEquals(out.valid, true);
  assertEquals(out.normalized, { size: 300 });
});

Deno.test("qr-validate: 400 is data; 403 throws", async () => {
  const bad = mockCtx([{ status: 400, body: { success: false, errors: ["unsupported format"] } }]);
  const out = await exec(action, { text: "x", format: "gif" }, bad.ctx);
  assertEquals(out.valid, false);
  assertEquals(out.errors, ["unsupported format"]);
  await assertRejects(
    () => exec(action, { text: "x" }, mockCtx([{ status: 403, body: "no" }]).ctx),
    Error,
    "403",
  );
});
