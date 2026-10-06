import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/text-ai-detect.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-ai-detect: calls text/ai_detection with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "sapling",
      feature: "text",
      subfeature: "ai_detection",
      output: { ai_score: 0.2 },
    },
  }]);
  const out = await action.execute({ text: "Some text", provider: "sapling" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "text/ai_detection/sapling");
  assertEquals(body.input, { text: "Some text" });
  assertEquals(out.provider, "sapling");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { ai_score: 0.2 });
});

Deno.test("text-ai-detect: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "sapling", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () => await action.execute({ text: "Some text", provider: "sapling" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("text-ai-detect: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ text: "Some text", provider: "sapling" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "text/ai_detection/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
