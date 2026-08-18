import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/embed.ts";

Deno.test("embed: accepts plain strings and wraps them the way Pinecone wants", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute!({ model: "multilingual-e5-large", inputs: '["a","b"]' }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.inputs, [{ text: "a" }, { text: "b" }]);
  assertEquals(new URL(calls[0].url).pathname, "/embed");
});

Deno.test("embed: Pinecone's own {text} shape passes through untouched", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ model: "m", inputs: '[{"text":"a"}]' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).inputs, [{ text: "a" }]);
});

/**
 * Asymmetric models embed a query differently from a passage, and getting it
 * wrong is silent — so it is its own field rather than buried in parameters.
 */
Deno.test("embed: input_type and truncate become model parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ model: "m", inputs: '["a"]', inputType: "query", truncate: "NONE" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parameters, { input_type: "query", truncate: "NONE" });
});

/** The host applies a param `default`; a bare execute() call does not. */
Deno.test("embed: unset parameters are left to the model rather than guessed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ model: "m", inputs: '["a"]' }, ctx);
  assertEquals("parameters" in JSON.parse(calls[0].body!), false);
});

Deno.test("embed: extra parameters win over the shorthand fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { model: "m", inputs: '["a"]', inputType: "query", parameters: '{"input_type":"passage"}' },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).parameters.input_type, "passage");
});

Deno.test("embed: empty inputs are refused", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ model: "m", inputs: "[]" }, ctx),
    Error,
    "inputs",
  );
  assertEquals(calls.length, 0);
});

Deno.test("embed: the input-type hint explains why it matters", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "inputType")!;
  assert(/no error/i.test(p.hint!), p.hint);
});
