import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse, PDF_BYTES } from "../_helpers.ts";
import action from "../../actions/file-convert-to-pdf.ts";

Deno.test("file-convert-to-pdf: POSTs the file to /tools/convert_to_pdf and returns it base64-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/pdf" },
    body: PDF_BYTES,
  }]);
  const out = await action.execute(
    { fileName: "contract.docx", fileUrl: "https://example.com/contract.docx" } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/tools/convert_to_pdf");
  assertEquals(JSON.parse(call.body!), {
    "file": { "name": "contract.docx", "url": "https://example.com/contract.docx" },
  });
  const file = out.file as { contentBase64: string; contentType: string; sizeBytes: number };
  assertEquals(file.contentType, "application/pdf");
  assertEquals(file.sizeBytes, PDF_BYTES.length);
  assertEquals(atob(file.contentBase64), new TextDecoder().decode(PDF_BYTES));
});

Deno.test("file-convert-to-pdf: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("file-convert-to-pdf: declares key, type and a description", () => {
  assertEquals(action.key, "file-convert-to-pdf");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
