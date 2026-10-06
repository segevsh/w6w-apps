import { assertEquals } from "@std/assert";
import pdfCreate from "../../actions/pdf-create.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

const queued = (url: string) => ({
  status: 200,
  body: { id: 7, status: "queued", [url]: null, polling_url: "https://api.placid.app/x" },
});

Deno.test("pdf-create: pages array required; modifications built from options", async () => {
  const pages = [{ template_uuid: "a", layers: { t: { text: "x" } } }];
  const { ctx, calls } = mockCtx([queued("pdf_url")]);
  await pdfCreate.execute({
    pages: JSON.stringify(pages),
    filename: "f",
    dpi: 300,
    color_mode: "cmyk",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/pdfs");
  assertEquals(JSON.parse(calls[0].body!), {
    pages,
    modifications: { filename: "f", dpi: 300, color_mode: "cmyk" },
  });
  await assertRejects(() => pdfCreate.execute({ pages: "[]" }, mockCtx().ctx));
  await assertRejects(() => pdfCreate.execute({ pages: undefined }, mockCtx().ctx));
});
