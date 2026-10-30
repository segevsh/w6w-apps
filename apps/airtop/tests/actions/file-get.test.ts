import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fileGet from "../../actions/file-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("file-get: reads a file's metadata and download URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({
      id: "f1",
      fileName: "doc.pdf",
      status: "available",
      downloadUrl: "https://x/y",
    }),
  }]);
  const out = await fileGet.execute({ fileId: "f1" }, ctx) as { downloadUrl: string };

  assertEquals(pathOf(calls[0].url), "/api/v1/files/f1");
  assertEquals(out.downloadUrl, "https://x/y");
});
