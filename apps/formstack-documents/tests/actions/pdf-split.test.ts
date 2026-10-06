import { assert, assertEquals } from "@std/assert";
import { mockCtx, parse, PDF_BYTES } from "../_helpers.ts";
import action from "../../actions/pdf-split.ts";

Deno.test("pdf-split: POSTs the file and page ranges", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "application/pdf" },
    body: PDF_BYTES,
  }]);
  const out = await action.execute(
    { fileName: "c.pdf", fileContents: "JVBERg==", extract: "1-3, 5" } as never,
    ctx,
  ) as Record<string, unknown>;
  const call = calls[0];
  assertEquals(call.method, "POST");
  const url = parse(call.url);
  assertEquals(url.origin, "https://www.webmerge.me");
  assertEquals(url.pathname, "/api/tools/split_pdf");
  assertEquals(JSON.parse(call.body!), {
    "file": { "name": "c.pdf", "contents": "JVBERg==" },
    "extract": "1-3, 5",
  });
  assertEquals("remove" in JSON.parse(call.body!), false);
  const file = out.file as { contentBase64: string; contentType: string; sizeBytes: number };
  assertEquals(file.contentType, "application/pdf");
  assertEquals(file.sizeBytes, PDF_BYTES.length);
  assertEquals(atob(file.contentBase64), new TextDecoder().decode(PDF_BYTES));
});

Deno.test("pdf-split: idempotent flag is true", () => {
  assertEquals(action.idempotent, true);
});

Deno.test("pdf-split: declares key, type and a description", () => {
  assertEquals(action.key, "pdf-split");
  assertEquals(action.type, "perform");
  assert(action.description!.length > 10);
});
