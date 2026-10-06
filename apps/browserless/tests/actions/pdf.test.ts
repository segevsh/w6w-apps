import { assertEquals, assertRejects } from "@std/assert";
import pdf from "../../actions/pdf.ts";
import { mockCtx } from "../_helpers.ts";

const BYTES = new TextEncoder().encode("%PDF-1.4");

Deno.test("pdf: builds options and margins and returns base64", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "application/pdf" }, body: BYTES }]);
  const out = await pdf.execute(
    {
      url: "https://example.com",
      format: "A4",
      landscape: true,
      printBackground: true,
      marginTop: "1cm",
      marginLeft: " 2cm ",
      pageRanges: "1-2",
      scale: 0.5,
    },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.sizeBytes, 8);
  assertEquals(atob(out.base64 as string), "%PDF-1.4");
  assertEquals(calls[0].url, "https://production-sfo.browserless.io/pdf");
  assertEquals(JSON.parse(calls[0].body!), {
    url: "https://example.com",
    options: {
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "1cm", left: "2cm" },
      pageRanges: "1-2",
      scale: 0.5,
    },
  });
});

Deno.test("pdf: no options means no options key", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "application/pdf" }, body: BYTES }]);
  await pdf.execute({ html: "<p>x</p>" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { html: "<p>x</p>" });
});

Deno.test("pdf: a pageRanges 500 surfaces the plain-text vendor message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "Page range exceeds page count" }]);
  await assertRejects(
    async () => await pdf.execute({ url: "https://a.com", pageRanges: "9-10" }, ctx),
    Error,
    "Page range exceeds page count",
  );
});

Deno.test("pdf: needs exactly one of url and html", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await pdf.execute({}, ctx), Error, "URL or HTML");
});
