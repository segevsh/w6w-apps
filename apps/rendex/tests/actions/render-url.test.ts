import { assertEquals, assertRejects } from "@std/assert";
import renderUrl from "../../actions/render-url.ts";
import renderHtml from "../../actions/render-html.ts";
import renderMarkdown from "../../actions/render-markdown.ts";
import { bodyOf, envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

const shot = {
  image: "aGk=",
  contentType: "image/png",
  url: "https://example.com",
  width: 1280,
  height: 800,
  format: "png",
};

Deno.test("render-url: POSTs /screenshot/json with url and capture options", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope(shot, { requestId: "r", usage: { credits: 1 } }),
  }]);
  const out = await obj(
    await renderUrl.execute({
      source: " https://example.com ",
      format: "pdf",
      fullPage: false,
      hideSelectors: '[".banner"]',
      pdfMargin: { top: "1in" },
    }, ctx),
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/screenshot/json");
  assertEquals(bodyOf(calls[0]), {
    url: "https://example.com",
    format: "pdf",
    fullPage: false,
    hideSelectors: [".banner"],
    pdfMargin: { top: "1in" },
  });
  assertEquals(out.image, "aGk=");
  assertEquals((out.meta as { usage: { credits: number } }).usage.credits, 1);
});

Deno.test("render-url: never sends template data (rejected by the API with a url)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(shot) }]);
  await renderUrl.execute({ source: "https://e.com", data: { a: 1 } }, ctx);
  assertEquals("data" in bodyOf(calls[0]), false);
  assertEquals(renderUrl.params!.some((p) => p.key === "data"), false);
});

Deno.test("render: blank source and bad JSON fail before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await renderUrl.execute({ source: "  " }, ctx),
    Error,
    "URL is required",
  );
  await assertRejects(
    async () => await renderHtml.execute({ source: "" }, ctx),
    Error,
    "HTML is required",
  );
  await assertRejects(
    async () => await renderMarkdown.execute({ source: "x", data: "{bad" }, ctx),
    Error,
    "Template data is not valid JSON",
  );
  assertEquals(calls.length, 0);
});
