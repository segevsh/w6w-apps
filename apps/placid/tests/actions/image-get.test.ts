import { assertEquals } from "@std/assert";
import imageGet from "../../actions/image-get.ts";
import pdfGet from "../../actions/pdf-get.ts";
import videoGet from "../../actions/video-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-get / pdf-get / video-get: GET by id on their own collection", async () => {
  for (
    const [action, path, url] of [
      [imageGet, "/images/9", "image_url"],
      [pdfGet, "/pdfs/9", "pdf_url"],
      [videoGet, "/videos/9", "video_url"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([{ body: { id: 9, status: "finished", [url]: "https://f" } }]);
    const out = await action.execute({ id: 9 as unknown as string }, ctx) as Record<
      string,
      unknown
    >;
    assertEquals(out[url], "https://f");
    assertEquals(calls[0].method, "GET");
    assertEquals(pathOf(calls[0].url), path);
    await assertRejects(() => action.execute({ id: "" }, mockCtx().ctx));
  }
});
