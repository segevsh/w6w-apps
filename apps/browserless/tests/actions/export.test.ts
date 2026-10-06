import { assertEquals, assertRejects } from "@std/assert";
import exportAction from "../../actions/export.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("export: a ZIP comes back as base64 with its file name", async () => {
  const { ctx, calls } = mockCtx([{
    headers: {
      "content-type": "application/zip",
      "content-disposition": 'attachment; filename="site.zip"',
    },
    body: new Uint8Array([80, 75]),
  }]);
  const out = await exportAction.execute({ url: "https://a.com", includeResources: true }, ctx);
  assertEquals(out, {
    contentType: "application/zip",
    sizeBytes: 2,
    filename: "site.zip",
    base64: "UEs=",
  });
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/export");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://a.com", includeResources: true });
});

Deno.test("export: an HTML export is returned as text", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "text/html" }, body: "<p>x</p>" }]);
  const out = await exportAction.execute({ url: "https://a.com" }, ctx) as Record<string, unknown>;
  assertEquals(out.text, "<p>x</p>");
});

Deno.test("export: needs a URL", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await exportAction.execute({}, ctx), Error, "URL or HTML");
});
