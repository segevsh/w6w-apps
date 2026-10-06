import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/ocr-extract.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ocr-extract: calls ocr/ocr with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "google",
      feature: "ocr",
      subfeature: "ocr",
      output: { text: "Invoice", bounding_boxes: [] },
    },
  }]);
  const out = await action.execute(
    { file: "https://x/a.png", language: "en", provider: "google" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "ocr/ocr/google");
  assertEquals(body.input, { file: "https://x/a.png", language: "en" });
  assertEquals(out.provider, "google");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { text: "Invoice", bounding_boxes: [] });
});

Deno.test("ocr-extract: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "google", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute({ file: "https://x/a.png", language: "en", provider: "google" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("ocr-extract: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ file: "https://x/a.png", language: "en", provider: "google" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "ocr/ocr/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
