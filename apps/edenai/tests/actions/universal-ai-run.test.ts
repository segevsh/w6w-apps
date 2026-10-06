import { assertEquals, assertRejects } from "@std/assert";
import universalAiRun from "../../actions/universal-ai-run.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("universal-ai-run: runs any feature with a JSON input and provider params", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.01",
      provider: "api4ai",
      feature: "image",
      subfeature: "background_removal",
      output: { url: "u" },
    },
  }]);
  const out = await universalAiRun.execute({
    feature: "image",
    subfeature: "background_removal",
    provider: "api4ai",
    input: '{"file":"https://x/p.jpg"}',
    providerParams: { mode: "fast" },
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(bodyOf(calls[0]), {
    model: "image/background_removal/api4ai",
    input: { file: "https://x/p.jpg" },
    provider_params: { mode: "fast" },
  });
  assertEquals(out.output, { url: "u" });
  assertEquals(out.cost, 0.01);
});

Deno.test("universal-ai-run: input that is not a JSON object fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  const base = { feature: "f", subfeature: "s", provider: "p" };
  await assertRejects(
    async () => await universalAiRun.execute({ ...base, input: "{bad" }, ctx),
    Error,
    "not valid JSON",
  );
  await assertRejects(
    async () => await universalAiRun.execute({ ...base, input: "" }, ctx),
    Error,
    "JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("universal-ai-run: a failed provider call is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "p", error: { message: "unsupported file" } },
  }]);
  await assertRejects(
    async () =>
      await universalAiRun.execute(
        { feature: "f", subfeature: "s", provider: "p", input: {} },
        ctx,
      ),
    Error,
    "unsupported file",
  );
});
