import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse, PDF_BYTES } from "../_helpers.ts";
import action from "../../actions/file-combine.ts";

Deno.test("file-combine: POSTs output and files and returns the PDF base64-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/pdf" },
    body: PDF_BYTES,
  }]);
  const out = await action.execute(
    { output: "pdf", files: [{ name: "a.pdf", url: "https://example.com/a.pdf" }] } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/tools/combine");
  assertEquals(JSON.parse(call.body!), {
    "output": "pdf",
    "files": [{ "name": "a.pdf", "url": "https://example.com/a.pdf" }],
  });
  const file = out.file as { contentBase64: string; contentType: string; sizeBytes: number };
  assertEquals(file.contentType, "application/pdf");
  assertEquals(file.sizeBytes, PDF_BYTES.length);
  assertEquals(atob(file.contentBase64), new TextDecoder().decode(PDF_BYTES));
});

Deno.test("file-combine: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("file-combine: declares key, type and a description", () => {
  assertEquals(action.key, "file-combine");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
