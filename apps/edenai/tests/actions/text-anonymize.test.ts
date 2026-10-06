import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/text-anonymize.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("text-anonymize: calls text/anonymization with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "amazon",
      feature: "text",
      subfeature: "anonymization",
      output: { result: "Call [NAME]" },
    },
  }]);
  const out = await action.execute(
    { text: "Call Bob", language: "en", provider: "amazon" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "text/anonymization/amazon");
  assertEquals(body.input, { text: "Call Bob", language: "en" });
  assertEquals(out.provider, "amazon");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { result: "Call [NAME]" });
});

Deno.test("text-anonymize: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "amazon", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () => await action.execute({ text: "Call Bob", language: "en", provider: "amazon" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("text-anonymize: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ text: "Call Bob", language: "en", provider: "amazon" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "text/anonymization/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
