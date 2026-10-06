import { assertEquals } from "@std/assert";
import action from "../../actions/wordcloud-render.ts";
import { exec, mockCtx, SVG } from "../_helpers.ts";

Deno.test("wordcloud-render: defaults to svg and splits the colours list", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "image/svg+xml" }, body: SVG }]);
  const out = await exec(action, {
    text: "a b b",
    colors: "red, #00f ,",
    useWordList: false,
    maxNumWords: 50,
  }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/wordcloud");
  assertEquals(JSON.parse(calls[0].body!), {
    text: "a b b",
    useWordList: false,
    maxNumWords: 50,
    format: "svg",
    colors: ["red", "#00f"],
  });
  assertEquals(out.svg, SVG);
});

Deno.test("wordcloud-render: no colours means no colors field", async () => {
  const { ctx, calls } = mockCtx([{ headers: { "content-type": "image/svg+xml" }, body: SVG }]);
  await exec(action, { text: "x", format: "png" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { text: "x", format: "png" });
});
