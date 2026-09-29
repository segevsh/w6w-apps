import { assertEquals } from "@std/assert";
import getFileUrls from "../../actions/get-file-urls.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-file-urls: POSTs /v1/files with { url } and returns fileUrl/storageUrl", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({
      file_url: "https://paperform.co/file/signed",
      storage_url: "https://s3.amazonaws.com/paperform/file.pdf",
    }),
  }]);
  const out = await getFileUrls.execute(
    { url: "https://s3.amazonaws.com/paperform/file.pdf" },
    ctx,
  ) as { fileUrl?: string; storageUrl?: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/files");
  assertEquals(JSON.parse(calls[0].body!), { url: "https://s3.amazonaws.com/paperform/file.pdf" });
  assertEquals(out.fileUrl, "https://paperform.co/file/signed");
  assertEquals(out.storageUrl, "https://s3.amazonaws.com/paperform/file.pdf");
});

Deno.test("get-file-urls: declares type read, despite the POST verb", () => {
  assertEquals(getFileUrls.type, "read");
});
