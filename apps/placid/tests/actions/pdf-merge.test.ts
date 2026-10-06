import { assertEquals } from "@std/assert";
import pdfMerge from "../../actions/pdf-merge.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

const queued = (url: string) => ({
  status: 200,
  body: { id: 7, status: "queued", [url]: null, polling_url: "https://api.placid.app/x" },
});

Deno.test("pdf-merge: 2 to 10 urls, POST /pdfs/merge", async () => {
  const { ctx, calls } = mockCtx([queued("pdf_url")]);
  await pdfMerge.execute({ urls: "https://a/1.pdf, https://a/2.pdf", passthrough: "k" }, ctx);
  assertEquals(pathOf(calls[0].url), "/pdfs/merge");
  assertEquals(JSON.parse(calls[0].body!), {
    urls: ["https://a/1.pdf", "https://a/2.pdf"],
    passthrough: "k",
  });
  await assertRejects(() => pdfMerge.execute({ urls: ["https://a/1.pdf"] }, mockCtx().ctx));
  const eleven = Array.from({ length: 11 }, (_, i) => `https://a/${i}.pdf`);
  await assertRejects(() => pdfMerge.execute({ urls: eleven }, mockCtx().ctx));
});
