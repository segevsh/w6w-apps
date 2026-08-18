import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { API_URL, ChecklyClient, compact, csv, json } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("the API base is what the spec's servers block states", () => {
  assertEquals(API_URL, "https://api.checklyhq.com");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertThrows(() => json("{oops", "target"), Error, "`target` is not valid JSON");
});

Deno.test("client: builds paths under the API base", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await new ChecklyClient(ctx).request("/v1/checks", { query: { limit: 10 } });
  assertEquals(calls[0].url, "https://api.checklyhq.com/v1/checks?limit=10");
});

/** Both halves of the credential live in the auth hook, not here. */
Deno.test("client: sends neither the key nor the account header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await new ChecklyClient(ctx).request("/v1/checks");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-checkly-account"], undefined);
});

Deno.test("client: a failure surfaces the status and Checkly's envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { statusCode: 401, error: "Unauthorized", message: "Missing authentication" },
  }]);
  const err = await assertRejects(
    async () => await new ChecklyClient(ctx).request("/v1/checks"),
    Error,
  );
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("Missing authentication"), err.message);
});

/**
 * Every list endpoint answers a bare array, so a short page is the only
 * end-of-collection signal there is.
 */
Deno.test("requestAll pages 1-based and stops on a short page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `c${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ id: "last" }] },
  ]);
  const all = await new ChecklyClient(ctx).requestAll("/v1/checks");
  assertEquals(all.length, 101);
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "1");
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("requestAll stops on the first page when it is already short", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "a" }] }]);
  assertEquals((await new ChecklyClient(ctx).requestAll("/v1/checks", {}, 50)).length, 1);
  assertEquals(calls.length, 1);
});

Deno.test("requestAll asks for no more than it wants, capped at Checkly's 100", async () => {
  const small = mockCtx([{ status: 200, body: [] }]);
  await new ChecklyClient(small.ctx).requestAll("/v1/checks", {}, 5);
  assertEquals(new URL(small.calls[0].url).searchParams.get("limit"), "5");

  const big = mockCtx([{ status: 200, body: [] }]);
  await new ChecklyClient(big.ctx).requestAll("/v1/checks", {}, Infinity);
  assertEquals(new URL(big.calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("requestAll tolerates a response that is not an array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { unexpected: true } }]);
  assertEquals(await new ChecklyClient(ctx).requestAll("/v1/checks"), []);
});
