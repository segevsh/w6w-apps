import { assert, assertEquals, assertRejects } from "@std/assert";
import toolCombine from "../../actions/tool-combine.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-combine: POSTs /api/tools/combine and returns the file base64-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    body: "PDFBYTES",
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await toolCombine.execute(
    {
      "output": "pdf",
      "files": [{ "name": "a.pdf", "url": "https://example.com/a.pdf" }, {
        "name": "b.pdf",
        "url": "https://example.com/b.pdf",
      }],
    } as never,
    ctx,
  ) as {
    contentBase64: string;
    contentType: string;
    size: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/tools/combine");
  assertEquals(out.contentBase64, btoa("PDFBYTES"));
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.size, 8);
});

Deno.test("tool-combine: sends output and the files array", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolCombine.execute(
    {
      "output": "pdf",
      "files": [{ "name": "a.pdf", "url": "https://example.com/a.pdf" }, {
        "name": "b.pdf",
        "url": "https://example.com/b.pdf",
      }],
    } as never,
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.output, "pdf");
  assertEquals(body.files.length, 2);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("tool-combine: files given as a JSON string are parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolCombine.execute(
    { output: "pdf", files: '[{"name":"a.pdf","url":"https://e.com/a.pdf"}]' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).files, [{ name: "a.pdf", url: "https://e.com/a.pdf" }]);
});

Deno.test("tool-combine: non-array files are refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(toolCombine.execute({ output: "pdf", files: '{"a":1}' } as never, ctx)),
    Error,
    "JSON array",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tool-combine: a vendor error surfaces its own message", async () => {
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
        toolCombine.execute(
          {
            "output": "pdf",
            "files": [{ "name": "a.pdf", "url": "https://example.com/a.pdf" }, {
              "name": "b.pdf",
              "url": "https://example.com/b.pdf",
            }],
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("422"), err.message);
  assert(err.message.includes("file: The file field is required."), err.message);
});
