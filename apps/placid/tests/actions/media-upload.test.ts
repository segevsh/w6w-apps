import { assert, assertEquals } from "@std/assert";
import mediaUpload from "../../actions/media-upload.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("media-upload: returns the first Placid URL and the media list", async () => {
  const media = [{ file_key: "logo", file_id: "https://storage.placid.app/2020-01-01/file.png" }];
  const { ctx, calls } = mockCtx([{ body: { media } }]);
  const out = await mediaUpload.execute({
    contentBase64: btoa("PNGDATA"),
    filename: "file.png",
    contentType: "image/png",
    fileKey: "logo",
  }, ctx);
  assertEquals(out, { url: media[0].file_id, media });
  assertEquals(pathOf(calls[0].url), "/media");
  assert(calls[0].headers["content-type"].includes("multipart/form-data"));
  const text = calls[0].binaryText ?? "";
  assert(text.includes('name="logo"; filename="file.png"'));
  assert(text.includes("Content-Type: image/png\r\n\r\nPNGDATA\r\n"));
  await assertRejects(() =>
    mediaUpload.execute(
      { contentBase64: "", filename: "a", contentType: "image/png" },
      mockCtx().ctx,
    )
  );
});
