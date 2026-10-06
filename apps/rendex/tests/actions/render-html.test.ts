import { assertEquals } from "@std/assert";
import renderHtml from "../../actions/render-html.ts";
import { bodyOf, envelope, mockCtx } from "../_helpers.ts";

const shot = {
  image: "aGk=",
  contentType: "image/png",
  url: "https://example.com",
  width: 1280,
  height: 800,
  format: "png",
};

Deno.test("render-html: sends html and parsed Mustache data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(shot) }]);
  await renderHtml.execute({ source: "<h1>{{t}}</h1>", data: '{"t":"Hi"}', width: 1200 }, ctx);
  assertEquals(bodyOf(calls[0]), { html: "<h1>{{t}}</h1>", data: { t: "Hi" }, width: 1200 });
});
