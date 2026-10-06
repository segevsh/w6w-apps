import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/resume-parse.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("resume-parse: calls ocr/resume_parser with the nested input and shapes the output", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      cost: "0.002",
      provider: "affinda",
      feature: "ocr",
      subfeature: "resume_parser",
      output: { extracted_data: {} },
    },
  }]);
  const out = await action.execute(
    { file: "https://x/cv.pdf", provider: "affinda" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/universal-ai");
  assertEquals(calls[0].method, "POST");
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "ocr/resume_parser/affinda");
  assertEquals(body.input, { file: "https://x/cv.pdf" });
  assertEquals(out.provider, "affinda");
  assertEquals(out.cost, 0.002);
  assertEquals(out.output, { extracted_data: {} });
});

Deno.test("resume-parse: a provider failure inside a 200 is thrown", async () => {
  const { ctx } = mockCtx([{
    body: { status: "fail", provider: "affinda", error: { message: "provider down" } },
  }]);
  await assertRejects(
    async () => await action.execute({ file: "https://x/cv.pdf", provider: "affinda" }, ctx),
    Error,
    "provider down",
  );
});

Deno.test("resume-parse: fallbacks and a provider model reach the request", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", output: {} } }]);
  await action.execute({
    ...{ file: "https://x/cv.pdf", provider: "affinda" },
    provider: "openai/gpt-4o",
    fallbacks: "a, b",
  }, ctx);
  const body = bodyOf(calls[0]);
  assertEquals(body.model, "ocr/resume_parser/openai/gpt-4o");
  assertEquals(body.fallbacks, ["a", "b"]);
});
