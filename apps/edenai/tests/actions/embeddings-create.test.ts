import { assertEquals, assertRejects } from "@std/assert";
import embeddingsCreate from "../../actions/embeddings-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("embeddings-create: embeds one text and returns vectors in input order", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: [
        { embedding: [0.3], index: 1, object: "embedding" },
        { embedding: [0.1], index: 0, object: "embedding" },
      ],
      model: "text-embedding-3-small",
      usage: { prompt_tokens: 2 },
      cost: 0.0001,
      provider: "openai",
    },
  }]);
  const out = await embeddingsCreate.execute({
    model: "openai/text-embedding-3-small",
    input: "hello",
    dimensions: 256,
  }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/embeddings");
  assertEquals(bodyOf(calls[0]), {
    model: "openai/text-embedding-3-small",
    input: "hello",
    dimensions: 256,
  });
  assertEquals(out.embeddings, [[0.1], [0.3]]);
  assertEquals(out.cost, 0.0001);
});

Deno.test("embeddings-create: a JSON array input embeds several texts", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await embeddingsCreate.execute({ model: "m", input: '["a","b"]' }, ctx);
  assertEquals(bodyOf(calls[0]).input, ["a", "b"]);
});

Deno.test("embeddings-create: empty input fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await embeddingsCreate.execute({ model: "m", input: "" }, ctx),
    Error,
    "Input is required",
  );
  assertEquals(calls.length, 0);
});
