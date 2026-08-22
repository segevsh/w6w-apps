import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DATASETS_SERVER,
  describeError,
  HUB,
  HuggingFaceClient,
  isGated,
  json,
  parseRateLimit,
  query,
  repoId,
  ROUTER,
} from "../../lib/client.ts";

Deno.test("the three hosts are distinct", () => {
  assertEquals(HUB, "https://huggingface.co");
  assertEquals(ROUTER, "https://router.huggingface.co");
  assertEquals(DATASETS_SERVER, "https://datasets-server.huggingface.co");
});

Deno.test("repoId: accepts namespace/name and the legacy bare form", () => {
  assertEquals(repoId("openai-community/gpt2", "id"), "openai-community/gpt2");
  assertEquals(repoId("gpt2", "id"), "gpt2", "the bare form still works, via a redirect");
  assertEquals(repoId("/gpt2/", "id"), "gpt2");
  assertThrows(() => repoId("", "id"), Error, "required");
});

Deno.test("repoId: a URL is refused with what to use instead", () => {
  const error = assertThrows(
    () => repoId("https://huggingface.co/openai-community/gpt2", "id"),
    Error,
  );
  assert(/A URL is not a repository id/.test(error.message), error.message);
});

/**
 * The IETF structured-fields form, which nothing else in this pack uses — a
 * client looking for X-RateLimit-Remaining finds nothing and concludes there
 * are no limits.
 */
Deno.test("parseRateLimit: reads the RFC-draft headers", () => {
  assertEquals(
    parseRateLimit('"api";r=494;t=170', '"fixed window";"api";q=500;w=300'),
    { remaining: 494, resetsIn: 170, quota: 500, window: 300 },
  );
});

Deno.test("parseRateLimit: absent headers give an empty result rather than NaN", () => {
  assertEquals(parseRateLimit(null, null), {
    remaining: undefined,
    resetsIn: undefined,
    quota: undefined,
    window: undefined,
  });
});

/** Both gate kinds block downloads, and both are accepted by a person. */
Deno.test("isGated: auto and manual are both gates", () => {
  assert(isGated("auto"));
  assert(isGated("manual"));
  assert(isGated(true));
  assert(!isGated(false));
  assert(!isGated(undefined));
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

Deno.test("request: defaults to the Hub and can be pointed at the other hosts", async () => {
  const hub = mockCtx([{ status: 200, body: {} }]);
  await new HuggingFaceClient(hub.ctx).request("/api/models");
  assertEquals(hub.calls[0].url, "https://huggingface.co/api/models");

  const router = mockCtx([{ status: 200, body: {} }]);
  await new HuggingFaceClient(router.ctx).request("/v1/models", { host: ROUTER });
  assertEquals(router.calls[0].url, "https://router.huggingface.co/v1/models");
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new HuggingFaceClient(ctx).request("/api/models");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("full: reports the rate limit alongside the data", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [],
    headers: {
      "content-type": "application/json",
      ratelimit: '"api";r=100;t=60',
      "ratelimit-policy": '"fixed window";"api";q=500;w=300',
    },
  }]);
  const result = await new HuggingFaceClient(ctx).full("/api/models");
  assertEquals(result.rateLimit.remaining, 100);
  assertEquals(result.rateLimit.quota, 500);
});

Deno.test("text mode returns the body verbatim rather than parsing it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "not json at all" }]);
  const result = await new HuggingFaceClient(ctx).request<string>("/x/resolve/main/README.md", {
    text: true,
  });
  assertEquals(result, "not json at all");
  assertEquals(calls[0].headers["accept"], "*/*");
});

/** The message names no token and says nothing about tokens. */
Deno.test("describeError: a 401 names the misleading message", () => {
  const message = describeError(401, JSON.stringify({ error: "Invalid username or password." }));
  assert(/says nothing\s+about tokens/.test(message), message);
});

/** A gate cannot be accepted by any credential. */
Deno.test("describeError: a 403 names both causes, including the gate", () => {
  const message = describeError(403, "{}");
  assert(/fine-grained token without this repository/.test(message), message);
  assert(/not by any token/.test(message), message);
});

Deno.test("describeError: a 404 names the rename trap with both examples", () => {
  const message = describeError(404, "{}");
  assert(/openai-community\/gpt2/.test(message), message);
  assert(/rajpurkar\/squad/.test(message), message);
});

Deno.test("describeError: 429 and 503 explain themselves", () => {
  assert(/RFC-draft\s+`ratelimit` header/.test(describeError(429, "{}")));
  assert(/estimated_time/.test(describeError(503, "{}")));
});

Deno.test("request: an error carries the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Repo not found" } }]);
  let message = "";
  try {
    await new HuggingFaceClient(ctx).request("/api/models/nope/nope");
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/\/api\/models\/nope\/nope/.test(message), message);
  assert(/renamed/.test(message), message);
});
