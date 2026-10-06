import { assert, assertEquals, assertRejects } from "@std/assert";
import toolPdfSplit from "../../actions/tool-pdf-split.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-pdf-split: POSTs /api/tools/pdf/split and returns the file base64-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    body: "PDFBYTES",
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await toolPdfSplit.execute(
    {
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "extract": "1-3,5",
      "remove": "2",
    } as never,
    ctx,
  ) as {
    contentBase64: string;
    contentType: string;
    size: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/tools/pdf/split");
  assertEquals(out.contentBase64, btoa("PDFBYTES"));
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.size, 8);
});

Deno.test("tool-pdf-split: sends the file reference", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfSplit.execute(
    {
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "extract": "1-3,5",
      "remove": "2",
    } as never,
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.file, { name: "a.pdf", url: "https://example.com/a.pdf" });
});

Deno.test("tool-pdf-split: with neither a URL nor contents, no request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const input = {
    ...{
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "extract": "1-3,5",
      "remove": "2",
    },
    fileUrl: undefined,
  };
  await assertRejects(
    () => Promise.resolve(toolPdfSplit.execute(input as never, ctx)),
    Error,
    "file URL",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tool-pdf-split: base64 contents are sent as file.contents", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfSplit.execute(
    {
      ...{
        "fileName": "a.pdf",
        "fileUrl": "https://example.com/a.pdf",
        "extract": "1-3,5",
        "remove": "2",
      },
      fileUrl: undefined,
      fileContents: "QUJD",
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).file, { name: "a.pdf", contents: "QUJD" });
});

Deno.test("tool-pdf-split: ranges are sent as one-element arrays; omitted ones are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }, { body: "x" }]);
  await toolPdfSplit.execute(
    {
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "extract": "1-3,5",
      "remove": "2",
    } as never,
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.extract, ["1-3,5"]);
  assertEquals(body.remove, ["2"]);
  await toolPdfSplit.execute({ fileUrl: "https://e.com/a.pdf", extract: "1" } as never, ctx);
  const second = JSON.parse(calls[1].body!);
  assertEquals(second.extract, ["1"]);
  assert(!("remove" in second));
});

Deno.test("tool-pdf-split: a vendor error surfaces its own message", async () => {
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
        toolPdfSplit.execute(
          {
            "fileName": "a.pdf",
            "fileUrl": "https://example.com/a.pdf",
            "extract": "1-3,5",
            "remove": "2",
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("422"), err.message);
  assert(err.message.includes("file: The file field is required."), err.message);
});
