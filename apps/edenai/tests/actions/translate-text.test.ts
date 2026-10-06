import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/translate-text.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("translate-text: calls translation/automatic_translation with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "deepl",
      feature: "translation",
      subfeature: "automatic_translation",
      output: { text: "bonjour" },
    },
  }]);
  const out = await action.execute(
    { text: "hello", targetLanguage: "fr", provider: "deepl" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "translation/automatic_translation/deepl");
  assertEquals(body.input, { text: "hello", target_language: "fr" });
  assertEquals(out.provider, "deepl");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { text: "bonjour" });
});

Deno.test("translate-text: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "deepl", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute({ text: "hello", targetLanguage: "fr", provider: "deepl" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("translate-text: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ text: "hello", targetLanguage: "fr", provider: "deepl" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "translation/automatic_translation/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
