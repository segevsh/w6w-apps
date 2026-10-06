import { assert, assertEquals, assertRejects } from "@std/assert";
import toolPdfEncrypt from "../../actions/tool-pdf-encrypt.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-pdf-encrypt: POSTs /api/tools/pdf/encrypt and returns the file base64-encoded", async () => {
  const { ctx, calls } = mockCtx([{
    body: "PDFBYTES",
    headers: { "content-type": "application/pdf" },
  }]);
  const out = await toolPdfEncrypt.execute(
    {
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "password": "owner-pw",
      "userPassword": "user-pw",
      "permissions": {},
    } as never,
    ctx,
  ) as {
    contentBase64: string;
    contentType: string;
    size: number;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/tools/pdf/encrypt");
  assertEquals(out.contentBase64, btoa("PDFBYTES"));
  assertEquals(out.contentType, "application/pdf");
  assertEquals(out.size, 8);
});

Deno.test("tool-pdf-encrypt: sends the file reference", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfEncrypt.execute(
    {
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "password": "owner-pw",
      "userPassword": "user-pw",
      "permissions": {},
    } as never,
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.file, { name: "a.pdf", url: "https://example.com/a.pdf" });
});

Deno.test("tool-pdf-encrypt: with neither a URL nor contents, no request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const input = {
    ...{
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "password": "owner-pw",
      "userPassword": "user-pw",
      "permissions": {},
    },
    fileUrl: undefined,
  };
  await assertRejects(
    () => Promise.resolve(toolPdfEncrypt.execute(input as never, ctx)),
    Error,
    "file URL",
  );
  assertEquals(calls.length, 0);
});

Deno.test("tool-pdf-encrypt: base64 contents are sent as file.contents", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfEncrypt.execute(
    {
      ...{
        "fileName": "a.pdf",
        "fileUrl": "https://example.com/a.pdf",
        "password": "owner-pw",
        "userPassword": "user-pw",
        "permissions": {},
      },
      fileUrl: undefined,
      fileContents: "QUJD",
    } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).file, { name: "a.pdf", contents: "QUJD" });
});

Deno.test("tool-pdf-encrypt: sends both passwords and the permissions object", async () => {
  const { ctx, calls } = mockCtx([{ body: "x" }]);
  await toolPdfEncrypt.execute(
    {
      "fileName": "a.pdf",
      "fileUrl": "https://example.com/a.pdf",
      "password": "owner-pw",
      "userPassword": "user-pw",
      "permissions": {},
    } as never,
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.password, "owner-pw");
  assertEquals(body.user_password, "user-pw");
  assertEquals(body.permissions, {});
});

Deno.test("tool-pdf-encrypt: a vendor error surfaces its own message", async () => {
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
        toolPdfEncrypt.execute(
          {
            "fileName": "a.pdf",
            "fileUrl": "https://example.com/a.pdf",
            "password": "owner-pw",
            "userPassword": "user-pw",
            "permissions": {},
          } as never,
          ctx,
        ),
      ),
    Error,
  );
  assert(err.message.includes("422"), err.message);
  assert(err.message.includes("file: The file field is required."), err.message);
});
