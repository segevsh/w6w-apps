import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/qr-read.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("qr-read: decodes a QR code from a URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "hello" } }]);
  const out = await exec(action, { url: "https://quickchart.io/qr?text=hello" }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/qr-read");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://quickchart.io/qr?text=hello" });
  assertEquals(out, { found: true, text: "hello" });
});

Deno.test("qr-read: the vendor's 500 for 'no QR code' is found:false, other 500s throw", async () => {
  const none = mockCtx([{ status: 500, body: { error: "No QR code was found in that image." } }]);
  assertEquals(await exec(action, { image: "AAAA" }, none.ctx), { found: false, text: null });
  const boom = mockCtx([{ status: 500, body: { error: "decoder crashed" } }]);
  await assertRejects(() => exec(action, { image: "AAAA" }, boom.ctx), Error, "decoder crashed");
});

Deno.test("qr-read: requires a url or image, and a 400 throws", async () => {
  await assertRejects(() => exec(action, {}, mockCtx().ctx), Error, "Provide an image URL");
  const bad = mockCtx([{ status: 400, body: { error: "Please provide either a URL or base64" } }]);
  await assertRejects(() => exec(action, { url: "x" }, bad.ctx), Error, "400");
});
