import { assert, assertEquals, assertRejects } from "@std/assert";
import upload from "../../actions/evidence-file-upload.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("evidence-file-upload: sends a multipart base64File part holding a JSON string", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: {
      fileKey: "a/b/report.pdf",
      originalFilename: "report.pdf",
      mimeType: "application/pdf",
      fileSize: 3,
    },
  }]);
  const out = await upload.execute({
    workspaceId: 7,
    filename: "report.pdf",
    contentBase64: "QUJD",
    mimeType: "application/pdf",
  }, ctx) as { fileKey: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v2/workspaces/7/evidence-files");
  const type = calls[0].headers["content-type"];
  const boundary = /^multipart\/form-data; boundary=(.+)$/.exec(type)?.[1];
  assert(boundary, type);
  const text = calls[0].body!;
  assert(
    text.startsWith(`--${boundary}\r\nContent-Disposition: form-data; name="base64File"\r\n\r\n`),
  );
  assert(text.endsWith(`\r\n--${boundary}--\r\n`));
  const json = JSON.parse(text.split("\r\n\r\n")[1].split("\r\n--")[0]);
  assertEquals(json, { base64String: "data:application/pdf;base64,QUJD", filename: "report.pdf" });
  assertEquals(out.fileKey, "a/b/report.pdf");
});

Deno.test("evidence-file-upload: content that is already a data URL is not wrapped twice", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { fileKey: "k" } }]);
  await upload.execute({
    workspaceId: 7,
    filename: "a.png",
    contentBase64: "data:image/png;base64,AAAA",
  }, ctx);
  const text = calls[0].body!;
  assert(text.includes('"base64String":"data:image/png;base64,AAAA"'));
  assertEquals(text.split("data:").length, 2);
});

Deno.test("evidence-file-upload: defaults the MIME type and surfaces an error", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: errorBody(400, "Unsupported extension", 2),
  }]);
  const err = await assertRejects(
    () =>
      Promise.resolve().then(() =>
        upload.execute({ workspaceId: 7, filename: "x.exe", contentBase64: "AA==" }, ctx)
      ),
    Error,
  );
  assert(calls[0].body!.includes("data:application/octet-stream;base64,AA=="));
  assert(err.message.includes("Unsupported extension"), err.message);
});
