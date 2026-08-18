import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_PATH,
  compact,
  csv,
  HOSTS,
  json,
  LaunchDarklyClient,
  readRateLimit,
  resolveEnvironment,
  resolveHost,
  resolveProject,
  SEMANTIC_PATCH_CONTENT_TYPE,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const conn = {
  display: { instance: "commercial", projectKey: "default", environmentKey: "production" },
};

Deno.test("the two hosts are what the spec's servers block lists", () => {
  assertEquals(HOSTS.commercial, "https://app.launchdarkly.com");
  assertEquals(HOSTS.federal, "https://app.launchdarkly.us");
  assertEquals(API_PATH, "/api/v2");
});

Deno.test("resolveHost defaults to commercial and honours the federal instance", () => {
  assertEquals(resolveHost(undefined), HOSTS.commercial);
  assertEquals(resolveHost({ display: {} } as never), HOSTS.commercial);
  assertEquals(resolveHost({ display: { instance: "federal" } } as never), HOSTS.federal);
  // An unknown value must not produce an undefined host.
  assertEquals(resolveHost({ display: { instance: "mars" } } as never), HOSTS.commercial);
});

/**
 * The content type is the whole difference between an instruction body and a
 * JSON Patch, so it is pinned.
 */
Deno.test("the semantic patch content type carries the domain-model parameter", () => {
  assertEquals(
    SEMANTIC_PATCH_CONTENT_TYPE,
    "application/json; domain-model=launchdarkly.semanticpatch",
  );
});

Deno.test("resolveProject and resolveEnvironment prefer the override, then explain", () => {
  assertEquals(resolveProject(conn as never, "other"), "other");
  assertEquals(resolveProject(conn as never, ""), "default");
  assertThrows(() => resolveProject({ display: {} } as never), Error, "no project");

  assertEquals(resolveEnvironment(conn as never, "staging"), "staging");
  assertEquals(resolveEnvironment(conn as never, ""), "production");
  assertThrows(() => resolveEnvironment({ display: {} } as never), Error, "no environment");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertThrows(() => json("{oops", "instructions"), Error, "`instructions` is not valid JSON");
});

/** Only the global pair says anything about the account. */
Deno.test("readRateLimit separates the global pair from the route pair", () => {
  const headers = new Headers({
    "x-ratelimit-global-limit": "1000",
    "x-ratelimit-global-remaining": "912",
    "x-ratelimit-route-limit": "10",
    "x-ratelimit-route-remaining": "9",
    "x-ratelimit-reset": "1787061262429",
  });
  assertEquals(readRateLimit(headers), {
    globalLimit: 1000,
    globalRemaining: 912,
    routeLimit: 10,
    routeRemaining: 9,
    resetAt: 1787061262429,
  });
});

Deno.test("readRateLimit reports nothing rather than zero when the headers are absent", () => {
  const empty = readRateLimit(new Headers());
  assertEquals(empty.globalRemaining, undefined);
  assertEquals(empty.resetAt, undefined);
});

Deno.test("client: builds paths on the connection's instance under /api/v2", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await new LaunchDarklyClient(ctx).request("/flags/default", { query: { limit: 5 } });
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/flags/default?limit=5");
});

Deno.test("client: the federal instance changes the host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { instance: "federal" },
  });
  await new LaunchDarklyClient(ctx).request("/projects");
  assertEquals(new URL(calls[0].url).host, "app.launchdarkly.us");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new LaunchDarklyClient(ctx).request("/projects");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** An array query value is comma-joined, not repeated. */
Deno.test("client: array query values are comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new LaunchDarklyClient(ctx).request("/flags/default", {
    query: { env: ["production", "staging"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.get("env"), "production,staging");
});

Deno.test("client: a failure surfaces the status and LaunchDarkly's envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { code: "unauthorized", message: "Invalid account ID header" },
  }], conn);
  const err = await assertRejects(
    async () => await new LaunchDarklyClient(ctx).request("/projects"),
    Error,
  );
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("unauthorized"), err.message);
});

/** Without the content-type parameter this body would be read as a JSON Patch. */
Deno.test("semanticPatch sends the domain-model content type and the instructions body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { key: "f" } }], conn);
  await new LaunchDarklyClient(ctx).semanticPatch("/flags/default/f", [{ kind: "turnFlagOn" }], {
    environmentKey: "production",
    comment: "ship it",
  });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], SEMANTIC_PATCH_CONTENT_TYPE);
  assertEquals(JSON.parse(calls[0].body!), {
    environmentKey: "production",
    comment: "ship it",
    instructions: [{ kind: "turnFlagOn" }],
  });
});

Deno.test("semanticPatch refuses an empty instruction list", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await new LaunchDarklyClient(ctx).semanticPatch("/x", []),
    Error,
    "at least one instruction",
  );
  assertEquals(calls.length, 0);
});

/** The list endpoints answer `{items}`, not a bare array. */
Deno.test("requestAll collects `items` and walks the offset", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ key: `f${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { items: full, totalCount: 101 } },
    { status: 200, body: { items: [{ key: "last" }] } },
  ], conn);
  const all = await new LaunchDarklyClient(ctx).requestAll("/flags/default");
  assertEquals(all.length, 101);
  assertEquals(new URL(calls[0].url).searchParams.get("offset"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("offset"), "100");
});

Deno.test("requestAll asks for no more than it wants, capped at 100", async () => {
  const small = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await new LaunchDarklyClient(small.ctx).requestAll("/projects", {}, 5);
  assertEquals(new URL(small.calls[0].url).searchParams.get("limit"), "5");

  const big = mockCtx([{ status: 200, body: { items: [] } }], conn);
  await new LaunchDarklyClient(big.ctx).requestAll("/projects", {}, Infinity);
  assertEquals(new URL(big.calls[0].url).searchParams.get("limit"), "100");
});
