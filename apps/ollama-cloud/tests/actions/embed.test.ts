import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, ok } from "./_shared.ts";
import action from "../../actions/embed.ts";

const vectors = ok({
  model: "nomic-embed-text",
  embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
  prompt_eval_count: 8,
});

test("embed: a single string goes to /api/embed and comes back as a list", async () => {
  const { ctx, calls } = mockCtx([ok({ embeddings: [[0.1, 0.2, 0.3]] })]);
  const result = await action.execute!(
    { model: "nomic-embed-text", input: "hello" },
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, `${BASE}/api/embed`);
  assertEquals(JSON.parse(calls[0].body!), { model: "nomic-embed-text", input: "hello" });
  assertEquals(result.count, 1);
  assertEquals(result.dimensions, 3);
});

test("embed: a JSON array string is a batch", async () => {
  const { ctx, calls } = mockCtx([vectors]);
  const result = await action.execute!({ model: "m", input: '["a", "b"]' }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[0].body!).input, ["a", "b"]);
  assertEquals(result.count, 2);
  assertEquals(result.promptTokens, 8);
});

test("embed: truncate is only sent when turned off, dimensions passes through", async () => {
  const { ctx, calls } = mockCtx([vectors]);
  await action.execute!({ model: "m", input: "x", truncate: false, dimensions: 256 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.truncate, false);
  assertEquals(body.dimensions, 256);
  assertEquals("keep_alive" in body, false);

  const second = mockCtx([vectors]);
  await action.execute!({ model: "m", input: "x", truncate: true }, second.ctx);
  assertEquals("truncate" in JSON.parse(second.calls[0].body!), false);
});

test("embed: empty input is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ model: "m", input: "  " }, ctx),
    Error,
    "`input`",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", input: "[]" }, ctx),
    Error,
    "`input`",
  );
  assertEquals(calls.length, 0);
});
