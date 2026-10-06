import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/barcode-render.ts";
import { exec, mockCtx, SVG } from "../_helpers.ts";

Deno.test("barcode-render: POSTs /barcode and returns svg markup", async () => {
  const { ctx, calls, created } = mockCtx(
    [{ headers: { "content-type": "image/svg+xml" }, body: SVG }],
    { files: true },
  );
  const out = await exec(action, {
    type: "code128",
    text: "ABC-1234",
    format: "svg",
    includeText: false,
  }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/barcode");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "code128",
    text: "ABC-1234",
    format: "svg",
    includeText: false,
  });
  assertEquals(created[0].filename, "barcode.svg");
  assertEquals(out.svg, SVG);
});

Deno.test("barcode-render: an unknown type surfaces the vendor's header message", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    headers: {
      "content-type": "image/png",
      "x-quickchart-error": "Error: unknown encoder name: code129",
    },
    body: "png",
  }]);
  await assertRejects(
    () => exec(action, { type: "code129", text: "x" }, ctx),
    Error,
    "unknown encoder name",
  );
});
