import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, display, ok } from "./_shared.ts";
import action from "../../actions/generate.ts";

const answer = ok({
  model: "llama3.2:3b",
  response: "Because of Rayleigh scattering.",
  done: true,
  done_reason: "stop",
  prompt_eval_count: 12,
  eval_count: 7,
  total_duration: 2_500_000_000,
  load_duration: 1_000_000_000,
});

test("generate: posts to /api/generate with stream false and reads the usage", async () => {
  const { ctx, calls } = mockCtx([answer], { display });
  const result = await action.execute!(
    { model: "llama3.2:3b", prompt: "Why is the sky blue?" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, `${BASE}/api/generate`);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "llama3.2:3b",
    prompt: "Why is the sky blue?",
    stream: false,
  });
  assertEquals(result.response, "Because of Rayleigh scattering.");
  assertEquals(result.promptTokens, 12);
  assertEquals(result.completionTokens, 7);
  assertEquals(result.totalSeconds, 2.5);
  assertEquals(result.loadSeconds, 1);
  assertEquals(result.doneReason, "stop");
});

test("generate: never sets an authorization header itself", async () => {
  const { ctx, calls } = mockCtx([answer], { display });
  await action.execute!({ model: "m", prompt: "p" }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("generate: options, keep_alive, think and images are shaped for Ollama", async () => {
  const { ctx, calls } = mockCtx([answer], { display });
  await action.execute!({
    model: "llava",
    prompt: "describe",
    system: "be brief",
    images: ["data:image/png;base64,AAAA", "BBBB"],
    think: "low",
    temperature: 0.2,
    numCtx: 8192,
    options: '{"top_k": 20, "temperature": 0.9}',
    keepAlive: "-1",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.images, ["AAAA", "BBBB"]);
  assertEquals(body.system, "be brief");
  assertEquals(body.think, "low");
  assertEquals(body.keep_alive, -1);
  // The named option beats the same key inside `options`.
  assertEquals(body.options, { top_k: 20, temperature: 0.2, num_ctx: 8192 });
});

test("generate: a JSON schema format is sent as an object and the reply is parsed", async () => {
  const { ctx, calls } = mockCtx([ok({ response: '{"age": 30}', done: true })], { display });
  const schema = { type: "object", properties: { age: { type: "integer" } } };
  const result = await action.execute!({
    model: "m",
    prompt: "p",
    format: JSON.stringify(schema),
  }, ctx) as { parsed: unknown };
  assertEquals(JSON.parse(calls[0].body!).format, schema);
  assertEquals(result.parsed, { age: 30 });
});

test("generate: format json is passed through as the string json", async () => {
  const { ctx, calls } = mockCtx([ok({ response: "not json", done: true })], { display });
  const result = await action.execute!({ model: "m", prompt: "p", format: "json" }, ctx) as {
    parsed: unknown;
    response: string;
  };
  assertEquals(JSON.parse(calls[0].body!).format, "json");
  assertEquals(result.parsed, undefined);
  assertEquals(result.response, "not json");
});

test("generate: validates before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ prompt: "p" }, ctx),
    Error,
    "`model` is required",
  );
  await assertRejects(
    async () => await action.execute!({ model: "m", prompt: " " }, ctx),
    Error,
    "`prompt`",
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

test("generate: an unknown model is a 404 that points at model-pull", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "model 'nope' not found" } }], {
    display,
  });
  const err = await assertRejects(async () =>
    await action.execute!({ model: "nope", prompt: "p" }, ctx)
  );
  assert(/model 'nope' not found/.test((err as Error).message));
  assert(/model-pull/.test((err as Error).message));
});

test("generate: a connection with no host fails with a reconnect message", async () => {
  const { ctx } = mockCtx([], { display: {} });
  await assertRejects(
    async () => await action.execute!({ model: "m", prompt: "p" }, ctx),
    Error,
    "reconnect",
  );
});
