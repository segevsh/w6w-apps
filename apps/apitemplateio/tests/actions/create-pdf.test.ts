import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-pdf.ts";

Deno.test("create-pdf: POSTs /v2/create-pdf with template_id in the query and data in the body", async () => {
  const body = { status: "success", download_url: "https://x/y.pdf", total_pages: 3 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { templateId: "tpl-2", data: { name: "Alice" } },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/create-pdf");
  assertEquals(url.searchParams.get("template_id"), "tpl-2");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "Alice" });
  assertEquals(result, body);
});

Deno.test("create-pdf: forwards filename, expiration, cmyk flag, and pdf standard", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await action.execute!(
    {
      templateId: "tpl-2",
      data: {},
      filename: "invoice.pdf",
      expiration: 120,
      isCmyk: true,
      pdfStandard: "PDFA1B",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filename"), "invoice.pdf");
  assertEquals(url.searchParams.get("expiration"), "120");
  assertEquals(url.searchParams.get("is_cmyk"), "1");
  assertEquals(url.searchParams.get("pdf_standard"), "PDFA1B");
});

Deno.test("create-pdf: omits is_cmyk and pdf_standard when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await action.execute!({ templateId: "tpl-2", data: {} }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("is_cmyk"), false);
  assertEquals(url.searchParams.has("pdf_standard"), false);
});
