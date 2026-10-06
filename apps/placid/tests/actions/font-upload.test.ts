import { assert, assertEquals } from "@std/assert";
import fontUpload from "../../actions/font-upload.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

const FONT = { uuid: "f1", title: "H", filename: "h.ttf", created_at: "2026-05-06T11:24:00+00:00" };

Deno.test("font-upload: multipart carries file, title and terms_accepted=1", async () => {
  const { ctx, calls } = mockCtx([{ body: FONT }]);
  await fontUpload.execute({
    contentBase64: btoa("FONTBYTES"),
    filename: "Brand.woff2",
    title: "Brand",
    terms_accepted: true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/fonts");
  assert(calls[0].headers["content-type"].startsWith("multipart/form-data; boundary="));
  const text = calls[0].binaryText ?? "";
  assert(text.includes('name="terms_accepted"\r\n\r\n1\r\n'));
  assert(text.includes('name="title"\r\n\r\nBrand\r\n'));
  assert(text.includes('name="file"; filename="Brand.woff2"'));
  assert(text.includes("Content-Type: font/woff2\r\n\r\nFONTBYTES\r\n"));
});

Deno.test("font-upload: refuses without terms or with a non-font extension", async () => {
  const b64 = btoa("x");
  await assertRejects(() =>
    fontUpload.execute(
      { contentBase64: b64, filename: "a.ttf", terms_accepted: false },
      mockCtx().ctx,
    )
  );
  await assertRejects(() =>
    fontUpload.execute(
      { contentBase64: b64, filename: "a.exe", terms_accepted: true },
      mockCtx().ctx,
    )
  );
});
