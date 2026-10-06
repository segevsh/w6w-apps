import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/watermark-apply.ts";
import { exec, IMG_HEADERS, mockCtx, PNG } from "../_helpers.ts";

Deno.test("watermark-apply: POSTs /watermark with both image URLs", async () => {
  const { ctx, calls, created } = mockCtx([{ headers: IMG_HEADERS, body: PNG }], { files: true });
  const out = await exec(action, {
    mainImageUrl: "https://example.com/a.png",
    markImageUrl: "https://example.com/logo.png",
    opacity: 0.5,
    position: "center",
  }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/watermark");
  assertEquals(JSON.parse(calls[0].body!), {
    mainImageUrl: "https://example.com/a.png",
    markImageUrl: "https://example.com/logo.png",
    opacity: 0.5,
    position: "center",
  });
  assertEquals(created[0].filename, "watermark.png");
  assertEquals(out.sizeBytes, PNG.length);
});

Deno.test("watermark-apply: a 400 throws with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "mainImageUrl unreachable" } }]);
  await assertRejects(
    () => exec(action, { mainImageUrl: "x", markImageUrl: "y" }, ctx),
    Error,
    "mainImageUrl unreachable",
  );
});
