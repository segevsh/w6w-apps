import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  BASE_URL,
  compact,
  describeError,
  format,
  images,
  modelOptions,
  optionalNumber,
  optionalString,
  requiredString,
  seconds,
  think,
  usage,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("BASE_URL: the cloud is one fixed origin, with no path of its own", () => {
  assertEquals(BASE_URL, "https://ollama.com");
  assertEquals(new URL(BASE_URL).origin, BASE_URL);
});

Deno.test("describeError: a rejected key names the key page", () => {
  const message = describeError(401, JSON.stringify({ error: "unauthorized" }));
  assert(/unauthorized/.test(message), message);
  assert(/settings\/keys/.test(message), message);
});

Deno.test("describeError: 404 points at model-list, 429 at the quota check, 5xx at the vendor", () => {
  assert(/model-list/.test(describeError(404, JSON.stringify({ error: "model x not found" }))));
  assert(/quota/.test(describeError(429, JSON.stringify({ error: "slow down" }))));
  assert(/Ollama Cloud could not answer/.test(describeError(503, "unavailable")));
  assertEquals(describeError(400, JSON.stringify({ error: "bad" })), "bad");
  assertEquals(describeError(418, ""), "HTTP 418");
});

Deno.test("describeError: an HTML error page is passed through, truncated", () => {
  const html = `<html>${"x".repeat(500)}</html>`;
  assertEquals(describeError(500, html).length, 300);
});

Deno.test("compact: unset, empty and empty-array keys are dropped", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: [0], g: false }),
    { a: 1, f: [0], g: false },
  );
});

Deno.test("requiredString / optionalString / optionalNumber", () => {
  assertEquals(requiredString("  hi ", "field"), "hi");
  assertThrows(() => requiredString("   ", "field"), Error, "`field` is required");
  assertEquals(optionalString("  "), undefined);
  assertEquals(optionalString(" x "), "x");
  assertEquals(optionalNumber("2.5", "n"), 2.5);
  assertEquals(optionalNumber("", "n"), undefined);
  assertThrows(() => optionalNumber("abc", "n"), Error, "must be a number");
});

Deno.test("images: a data URI prefix is stripped, and text splits on newlines or commas", () => {
  assertEquals(images(["data:image/png;base64,AAAA", "BBBB"]), ["AAAA", "BBBB"]);
  assertEquals(images("AAAA\nBBBB,CCCC"), ["AAAA", "BBBB", "CCCC"]);
  assertEquals(images('["AAAA"]'), ["AAAA"]);
  assertEquals(images("   "), undefined);
});

Deno.test("format: blank, json, or a JSON Schema", () => {
  assertEquals(format(""), undefined);
  assertEquals(format("JSON"), "json");
  assertEquals(format('{"type":"object"}'), { type: "object" });
  assertThrows(() => format("[1]"), Error, "`format`");
});

Deno.test("think: true/false/effort levels, and nothing else", () => {
  assertEquals(think("true"), true);
  assertEquals(think(false), false);
  assertEquals(think("HIGH"), "high");
  assertEquals(think(""), undefined);
  assertThrows(() => think("maybe"), Error, "`think`");
});

Deno.test("modelOptions: named params win over the same key in options", () => {
  assertEquals(modelOptions({}), undefined);
  assertEquals(
    modelOptions({ options: '{"top_k": 20, "temperature": 0.9}', temperature: 0.2 }),
    { top_k: 20, temperature: 0.2 },
  );
  assertThrows(() => modelOptions({ options: "[1]" }), Error, "`options`");
});

Deno.test("usage / seconds: nanosecond durations become seconds", () => {
  assertEquals(seconds(1_500_000_000), 1.5);
  assertEquals(seconds("x"), undefined);
  assertEquals(usage({ prompt_eval_count: 3, eval_count: 2, total_duration: 1e9 }), {
    promptTokens: 3,
    completionTokens: 2,
    totalSeconds: 1,
    loadSeconds: undefined,
  });
  assertEquals(usage(undefined).promptTokens, undefined);
});

Deno.test("client: a GET is unauthenticated at this layer and a JSON body is returned", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "0.34.1" } }]);
  const { OllamaCloudClient } = await import("../../lib/client.ts");
  const body = await new OllamaCloudClient(ctx).request("/api/version");
  assertEquals(calls[0].url, "https://ollama.com/api/version");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(body, { version: "0.34.1" });
});

Deno.test("client: a POST sends JSON, and a failure throws with the mapped message", async () => {
  const { ctx, calls } = mockCtx([{ status: 404, body: { error: "model 'x' not found" } }]);
  const { OllamaCloudClient } = await import("../../lib/client.ts");
  const client = new OllamaCloudClient(ctx);
  await assertRejects(
    () => client.request("/api/chat", { method: "POST", body: { a: 1 } }),
    Error,
    "model-list",
  );
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: a non-JSON 200 is an error, and a 204 is undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>" }]);
  const { OllamaCloudClient } = await import("../../lib/client.ts");
  await assertRejects(
    () => new OllamaCloudClient(ctx).request("/api/version"),
    Error,
    "did not return JSON",
  );

  const empty = mockCtx([{ status: 204 }]);
  assertEquals(await new OllamaCloudClient(empty.ctx).request("/api/tags"), undefined);
});
