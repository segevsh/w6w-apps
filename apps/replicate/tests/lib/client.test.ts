import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_URL,
  compact,
  csv,
  json,
  preferWait,
  ReplicateClient,
  splitModel,
  TERMINAL_STATES,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("the API base is what the spec's servers block states", () => {
  assertEquals(API_URL, "https://api.replicate.com/v1");
  assertEquals([...TERMINAL_STATES], ["succeeded", "failed", "canceled"]);
});

/** Replicate caps the wait at 60 seconds; asking for more is a client error. */
Deno.test("preferWait builds the header and enforces Replicate's 1–60 range", () => {
  assertEquals(preferWait(0), undefined);
  assertEquals(preferWait(""), undefined);
  assertEquals(preferWait(false), undefined);
  assertEquals(preferWait(true), "wait");
  assertEquals(preferWait(30), "wait=30");
  assertEquals(preferWait("45"), "wait=45");
  assertThrows(() => preferWait(90), Error, "between 1 and 60");
  assertThrows(() => preferWait("soon"), Error, "must be a number of seconds");
});

Deno.test("splitModel takes owner/name, and ignores a version suffix", () => {
  assertEquals(splitModel("black-forest-labs/flux-schnell"), {
    owner: "black-forest-labs",
    name: "flux-schnell",
  });
  // `owner/name:version` is how Replicate writes a pinned version.
  assertEquals(splitModel("acme/thing:abc123"), { owner: "acme", name: "thing" });
  assertThrows(() => splitModel(""), Error, "`model` is required");
  assertThrows(() => splitModel("just-a-name"), Error, 'should be "owner/name"');
  assertThrows(() => splitModel("a/b/c"), Error, 'should be "owner/name"');
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("start, completed"), ["start", "completed"]);
  assertThrows(() => json("{oops", "input"), Error, "`input` is not valid JSON");
});

Deno.test("client: builds paths under the v1 base", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ReplicateClient(ctx).request("/predictions", { query: { source: "api" } });
  assertEquals(calls[0].url, "https://api.replicate.com/v1/predictions?source=api");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ReplicateClient(ctx).request("/account");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: extra headers reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new ReplicateClient(ctx).request("/predictions", {
    method: "POST",
    body: {},
    headers: { prefer: "wait=30" },
  });
  assertEquals(calls[0].headers["prefer"], "wait=30");
});

/** The readme endpoint answers Markdown, which JSON.parse would reject. */
Deno.test("client: a raw request returns the body as text", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "# Hello\n\nnot json", headers: {} }]);
  assertEquals(
    await new ReplicateClient(ctx).request<string>("/models/a/b/readme", { raw: true }),
    "# Hello\n\nnot json",
  );
});

Deno.test("client: a failure surfaces the status and Replicate's problem details", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    statusText: "Unprocessable Entity",
    body: { title: "Invalid input", detail: "input.prompt is required", status: 422 },
  }]);
  const err = await assertRejects(
    async () =>
      await new ReplicateClient(ctx).request("/predictions", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("422"), err.message);
  assert(err.message.includes("input.prompt is required"), err.message);
});

/**
 * `next` is a complete URL rather than a token, so the walk follows it verbatim
 * instead of rebuilding a query.
 */
Deno.test("requestAll follows the absolute `next` URL", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        results: [{ id: "a" }],
        next: "https://api.replicate.com/v1/predictions?cursor=abc123",
      },
    },
    { status: 200, body: { results: [{ id: "b" }], next: null } },
  ]);
  const all = await new ReplicateClient(ctx).requestAll("/predictions");
  assertEquals(all, [{ id: "a" }, { id: "b" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "abc123");
  // The /v1 prefix is not doubled up.
  assertEquals(new URL(calls[1].url).pathname, "/v1/predictions");
});

Deno.test("requestAll stops when there is no cursor, and at the wanted total", async () => {
  const single = mockCtx([{ status: 200, body: { results: [{ id: "a" }] } }]);
  assertEquals((await new ReplicateClient(single.ctx).requestAll("/models")).length, 1);
  assertEquals(single.calls.length, 1);

  const capped = mockCtx([{
    status: 200,
    body: { results: [{ id: "a" }, { id: "b" }, { id: "c" }], next: "https://x/v1/models?c=2" },
  }]);
  assertEquals((await new ReplicateClient(capped.ctx).requestAll("/models", {}, 2)).length, 2);
  assertEquals(capped.calls.length, 1);
});

Deno.test("requestAll stops on an empty page rather than looping", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { results: [{ id: "a" }], next: "https://api.replicate.com/v1/models?c=2" },
    },
    { status: 200, body: { results: [], next: "https://api.replicate.com/v1/models?c=3" } },
  ]);
  assertEquals((await new ReplicateClient(ctx).requestAll("/models")).length, 1);
  assertEquals(calls.length, 2);
});
