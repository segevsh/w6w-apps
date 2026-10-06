import { assert, assertEquals, assertRejects } from "@std/assert";
import toolPdfCompress from "../../actions/tool-pdf-compress.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-pdf-compress: POSTs /api/tools/pdf/compress and returns the file base64-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    body: "PDFBYTES",
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await toolPdfCompress.execute(
    { "fileName": "a.pdf", "fileUrl": "https://example.com/a.pdf" } as never,
    ctx,
  ) as {
    contentBase64: string;
    contentType: string;
    size: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/tools/pdf/compress");
  assertEquals(out.contentBase64, btoa("PDFBYTES"));
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.size, 8);
});

Deno.test("tool-pdf-compress: sends the file reference", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfCompress.execute(
    { "fileName": "a.pdf", "fileUrl": "https://example.com/a.pdf" } as never,
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.file, { name: "a.pdf", url: "https://example.com/a.pdf" });
});

Deno.test("tool-pdf-compress: with neither a URL nor contents, no request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const input = {
    ...{ "fileName": "a.pdf", "fileUrl": "https://example.com/a.pdf" },
    fileUrl: undefined,
  };
  await assertRejects(
    () => Promise.resolve(toolPdfCompress.execute(input as never, ctx)),
    Error,
    "file URL",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tool-pdf-compress: base64 contents are sent as file.contents", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfCompress.execute(
    {
      ...{ "fileName": "a.pdf", "fileUrl": "https://example.com/a.pdf" },
      fileUrl: undefined,
      fileContents: "QUJD",
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).file, { name: "a.pdf", contents: "QUJD" });
});

Deno.test("tool-pdf-compress: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      message: "The given data was invalid.",
      errors: { file: ["The file field is required."] },
    },
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        toolPdfCompress.execute(
          { "fileName": "a.pdf", "fileUrl": "https://example.com/a.pdf" } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("422"), err.message);
  assert(err.message.includes("file: The file field is required."), err.message);
});
