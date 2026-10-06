import { assertEquals } from "@std/assert";
import renderMarkdown from "../../actions/render-markdown.ts";
import { bodyOf, envelope, mockCtx } from "../_helpers.ts";

const shot = {
  image: "aGk=",
  contentType: "image/png",
  url: "https://example.com",
  width: 1280,
  height: 800,
  format: "png",
};

Deno.test("render-markdown: sends markdown", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(shot) }]);
  await renderMarkdown.execute({ source: "# Hi", format: "webp", quality: 70 }, ctx);
  assertEquals(bodyOf(calls[0]), { markdown: "# Hi", format: "webp", quality: 70 });
});
