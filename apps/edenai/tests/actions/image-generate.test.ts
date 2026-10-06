import { assertEquals } from "@std/assert";
import imageGenerate from "../../actions/image-generate.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-generate: sends the prompt and returns images and their URLs", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [{ url: "https://img/1.png" }, { b64_json: "AAAA" }],
      cost: 0.04,
      provider: "openai",
    },
  }]);
  const out = await imageGenerate.execute({
    model: "openai/gpt-image-2",
    prompt: "a cat",
    n: 2,
    size: "1024x1024",
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/images/generations");
  assertEquals(bodyOf(calls[0]), {
    model: "openai/gpt-image-2",
    prompt: "a cat",
    n: 2,
    size: "1024x1024",
  });
  assertEquals(out.urls, ["https://img/1.png"]);
  assertEquals((out.images as unknown[]).length, 2);
  assertEquals(out.cost, 0.04);
});

Deno.test("image-generate: an empty data list yields no images", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await imageGenerate.execute({ model: "m", prompt: "p" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.images, []);
  assertEquals(out.urls, []);
});
