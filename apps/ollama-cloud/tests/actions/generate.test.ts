import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, ok } from "./_shared.ts";
import action from "../../actions/generate.ts";

const answer = ok({
  model: "llama3.2:3b",
  response: "Hello!",
  done: true,
  done_reason: "stop",
  prompt_eval_count: 4,
  eval_count: 2,
  total_duration: 2_500_000_000,
  load_duration: 1_000_000_000,
});

test("generate: posts the prompt to the fixed cloud origin with stream false", async () => {
  const { ctx, calls } = mockCtx([answer]);
  const result = await action.execute!({ model: "llama3.2:3b", prompt: "hi" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].url, `${BASE}/api/generate`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "llama3.2:3b",
    prompt: "hi",
    stream: false,
  });
  assertEquals(result.response, "Hello!");
  assertEquals(result.promptTokens, 4);
  assertEquals(result.completionTokens, 2);
  assertEquals(result.totalSeconds, 2.5);
  assertEquals(result.loadSeconds, 1);
});

test("generate: options, think and images are shaped for the API", async () => {
  const { ctx, calls } = mockCtx([answer]);
  await action.execute!({
    model: "m",
    prompt: "p",
    system: "be brief",
    images: ["data:image/png;base64,AAAA"],
    think: "high",
    temperature: 0.2,
    numPredict: 64,
    options: { top_k: 20, temperature: 0.9 },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.system, "be brief");
  assertEquals(body.images, ["AAAA"]);
  assertEquals(body.think, "high");
  assertEquals(body.options, { top_k: 20, temperature: 0.2, num_predict: 64 });
  assertEquals("keep_alive" in body, false);
});

test("generate: json format parses the response, an unparsable one stays text", async () => {
  const first = mockCtx([ok({ response: '{"age": 30}', done: true })]);
  const parsed = await action.execute!({ model: "m", prompt: "p", format: "json" }, first.ctx) as {
    parsed: unknown;
  };
  assertEquals(JSON.parse(first.calls[0].body!).format, "json");
  assertEquals(parsed.parsed, { age: 30 });

  const second = mockCtx([ok({ response: "not json", done: true })]);
  const text = await action.execute!({ model: "m", prompt: "p", format: "json" }, second.ctx) as {
    parsed: unknown;
    response: string;
  };
  assertEquals(text.parsed, undefined);
  assertEquals(text.response, "not json");
});

test("generate: a blank prompt, a blank model or bad options are refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ model: "m", prompt: "  " }, ctx), Error);
  await assertRejects(async () => await action.execute!({ model: "", prompt: "p" }, ctx), Error);
  await assertRejects(
    async () => await action.execute!({ model: "m", prompt: "p", options: "nope" }, ctx),
    Error,
    "JSON",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", prompt: "p", format: "[1]" }, ctx),
    Error,
    "`format`",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", prompt: "p", think: "maybe" }, ctx),
    Error,
    "`think`",
  );
  assertEquals(calls.length, 0);
});

test("generate: a rejected key is explained at the key page, not as a local server", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "unauthorized" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ model: "m", prompt: "p" }, ctx),
  );
  assert(/settings\/keys/.test((err as Error).message), (err as Error).message);
});

test("generate: an unknown model is a 404 that points at model-list", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "model 'x' not found" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ model: "x", prompt: "p" }, ctx),
  );
  assert(/model-list/.test((err as Error).message), (err as Error).message);
});

test("generate: a rate limit names itself and points at the quota check", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: "too many requests" } }]);
  const err = await assertRejects(
    async () => await action.execute!({ model: "m", prompt: "p" }, ctx),
  );
  assert(/quota/.test((err as Error).message), (err as Error).message);
});
