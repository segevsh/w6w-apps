import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/qr-render.ts";
import { exec, IMG_HEADERS, mockCtx, PNG } from "../_helpers.ts";

Deno.test("qr-render: POSTs /qr with only the set options and stores a PNG file", async () => {
  const { ctx, calls, created } = mockCtx([{ headers: IMG_HEADERS, body: PNG }], { files: true });
  const out = await exec(action, {
    text: "https://example.com/?a=1&b=2",
    size: 300,
    dark: "f00",
    dotStyle: "rounded",
  }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/qr");
  assertEquals(JSON.parse(calls[0].body!), {
    text: "https://example.com/?a=1&b=2",
    format: "png",
    size: 300,
    dark: "f00",
    dotStyle: "rounded",
  });
  assertEquals(created[0].filename, "qr.png");
  assertEquals(out.contentType, "image/png");
});

Deno.test("qr-render: a 400 uses the X-quickchart-error header", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    headers: { "content-type": "image/png", "x-quickchart-error": "text is required" },
    body: PNG,
  }]);
  await assertRejects(() => exec(action, { text: "" }, ctx), Error, "text is required");
});
