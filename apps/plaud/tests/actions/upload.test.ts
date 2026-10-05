import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import presign from "../../actions/upload-presign.ts";
import complete from "../../actions/upload-complete.ts";

const D = { display: { region: "us" } };
const BASE = "https://platform-us.plaud.ai/developer/api/open/partner/files/upload";

Deno.test("upload-presign: POSTs snake_case, maps the PascalCase answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      FileId: "file_1",
      UploadId: "upload_1",
      ChunkSize: 5242880,
      Parts: [{ PartNumber: 1, PresignedUrl: "https://s3/x" }],
    },
  }], D);
  const out = await presign.execute({ filesize: 10485760, filetype: "mp3" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, `${BASE}/generate-presigned-urls`);
  assertEquals(JSON.parse(calls[0].body!), { filesize: 10485760, filetype: "mp3" });
  assertEquals(out, {
    fileId: "file_1",
    uploadId: "upload_1",
    chunkSize: 5242880,
    parts: [{ partNumber: 1, presignedUrl: "https://s3/x" }],
  });
});

Deno.test("upload-presign: rejects a bad size or type before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    () => Promise.resolve(presign.execute({ filesize: 0, filetype: "mp3" }, ctx)),
    Error,
    "filesize",
  );
  await assertRejects(
    () => Promise.resolve(presign.execute({ filesize: 5, filetype: "wav" }, ctx)),
    Error,
    "filetype",
  );
  assertEquals(calls.length, 0);
});

Deno.test("upload-complete: sends part_list with PascalCase keys, accepting JSON text or camelCase", async () => {
  const { ctx, calls } = mockCtx([{
    body: { FileId: "file_1", FileType: "mp3", DownloadUrl: "https://s3/dl", FileMd5: "abc" },
  }], D);
  const out = await complete.execute({
    fileId: "file_1",
    uploadId: "upload_1",
    parts: '[{"partNumber":1,"etag":"\\"e1\\""},{"PartNumber":2,"ETag":"\\"e2\\""}]',
    filetype: "mp3",
    md5: "abc",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `${BASE}/complete-upload`);
  assertEquals(JSON.parse(calls[0].body!), {
    file_id: "file_1",
    upload_id: "upload_1",
    part_list: [{ PartNumber: 1, ETag: '"e1"' }, { PartNumber: 2, ETag: '"e2"' }],
    filetype: "mp3",
    file_md5: "abc",
  });
  assertEquals(out, {
    fileId: "file_1",
    fileType: "mp3",
    downloadUrl: "https://s3/dl",
    md5: "abc",
  });
});

Deno.test("upload-complete: omits file_md5 when unset, and validates parts", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], D);
  await complete.execute({
    fileId: "f",
    uploadId: "u",
    parts: [{ PartNumber: 1, ETag: "e" }],
    filetype: "opus",
  }, ctx);
  assertEquals("file_md5" in JSON.parse(calls[0].body!), false);
  await assertRejects(
    () =>
      Promise.resolve(
        complete.execute({ fileId: "f", uploadId: "u", parts: [], filetype: "mp3" }, ctx),
      ),
    Error,
    "parts",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        complete.execute({
          fileId: "f",
          uploadId: "u",
          parts: [{ PartNumber: 1 }],
          filetype: "mp3",
        }, ctx),
      ),
    Error,
    "ETag",
  );
  await assertRejects(
    () =>
      Promise.resolve(
        complete.execute({ fileId: "f", uploadId: "u", parts: "{", filetype: "mp3" }, ctx),
      ),
    Error,
    "JSON",
  );
});
