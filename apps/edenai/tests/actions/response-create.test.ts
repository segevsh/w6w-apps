import { assertEquals, assertRejects } from "@std/assert";
import responseCreate, { outputText } from "../../actions/response-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const reply = {
  id: "resp_1",
  status: "completed",
  model: "gpt-4o",
  output: [{
    type: "message",
    content: [{ type: "output_text", text: "Hello " }, { type: "output_text", text: "there" }],
  }],
  cost: 0.01,
  provider: "openai",
};

Deno.test("outputText: concatenates output_text parts of message items only", () => {
  assertEquals(outputText(reply.output), "Hello there");
  assertEquals(outputText([{ type: "reasoning" }]), "");
  assertEquals(outputText(undefined), "");
});

Deno.test("response-create: sends the Responses API body and returns the text", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await responseCreate.execute({
    model: "openai/gpt-4o",
    input: "Hi",
    instructions: "Be kind",
    maxOutputTokens: 100,
    store: true,
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/responses");
  assertEquals(bodyOf(calls[0]), {
    model: "openai/gpt-4o",
    input: "Hi",
    instructions: "Be kind",
    max_output_tokens: 100,
    store: true,
  });
  assertEquals(out.text, "Hello there");
  assertEquals(out.id, "resp_1");
  assertEquals(out.cost, 0.01);
});

Deno.test("response-create: a JSON-array input is sent as items; a follow-up needs no input", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }, { body: reply }]);
  await responseCreate.execute({ model: "m", input: '[{"role":"user","content":"x"}]' }, ctx);
  assertEquals(bodyOf(calls[0]).input, [{ role: "user", content: "x" }]);
  await responseCreate.execute({ model: "m", previousResponseId: "resp_1" }, ctx);
  assertEquals(bodyOf(calls[1]).previous_response_id, "resp_1");
  assertEquals("input" in bodyOf(calls[1]), false);
});

Deno.test("response-create: text starting with a bracket that is not JSON stays text", async () => {
  const { ctx, calls } = mockCtx([{ body: reply }]);
  await responseCreate.execute({ model: "m", input: "[note] hello" }, ctx);
  assertEquals(bodyOf(calls[0]).input, "[note] hello");
});

Deno.test("response-create: no input and no previous response fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await responseCreate.execute({ model: "m" }, ctx),
    Error,
    "Provide Input",
  );
  assertEquals(calls.length, 0);
});
