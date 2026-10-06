import { assertEquals, assertRejects } from "@std/assert";
import createResponse from "../../actions/create-response.ts";
import { mockCtx } from "../_helpers.ts";

const RESP = { object: "response", output_text: "hello", model: "linkup-standard" };

Deno.test("create-response: plain-text input", async () => {
  const { ctx, calls } = mockCtx([{ body: RESP }]);
  const out = await createResponse.execute({
    input: "What is X?",
    model: "linkup-standard",
    instructions: " be brief ",
  }, ctx);
  assertEquals(out, { outputText: "hello", response: RESP });
  assertEquals(calls[0].url, "https://api.linkup.so/v1/responses");
  assertEquals(JSON.parse(calls[0].body!), {
    input: "What is X?",
    model: "linkup-standard",
    instructions: "be brief",
  });
  assertEquals(createResponse.idempotent, false);
});

Deno.test("create-response: message array and text format", async () => {
  const { ctx, calls } = mockCtx([{ body: RESP }, { body: RESP }]);
  const messages = [{ role: "user", content: "hi" }];
  await createResponse.execute({
    input: JSON.stringify(messages),
    model: "linkup-deep",
    format: '{"type":"object"}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    input: messages,
    model: "linkup-deep",
    text: { format: { type: "object" } },
  });
  await createResponse.execute({ input: "q", model: "linkup-deep", format: "text" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).text, { format: "text" });
});

Deno.test("create-response: validation", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await createResponse.execute({ input: "q", model: "gpt" }, ctx),
    Error,
    "model",
  );
  await assertRejects(
    async () => await createResponse.execute({ input: "  ", model: "linkup-deep" }, ctx),
    Error,
    "Input must be",
  );
  await assertRejects(
    async () => await createResponse.execute({ input: [], model: "linkup-deep" }, ctx),
    Error,
    "Input must be",
  );
  assertEquals(calls.length, 0);
});
