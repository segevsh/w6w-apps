import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  encodeBase64,
  JenkinsClient,
  jobPath,
  parseQueueId,
  resolveBaseUrl,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const display = { endpoint: "https://ci.example.com" };

/**
 * The sandbox runs hooks with `import: false`, so `@std/encoding` is out of
 * reach at runtime and this encoder is inlined. It has to match byte for byte —
 * standard alphabet, `=` padding, no url-safe swaps — or Basic auth breaks.
 */
Deno.test("encodeBase64: matches the standard alphabet and padding", () => {
  assertEquals(encodeBase64(""), "");
  assertEquals(encodeBase64("f"), "Zg==");
  assertEquals(encodeBase64("fo"), "Zm8=");
  assertEquals(encodeBase64("foo"), "Zm9v");
  assertEquals(encodeBase64("ada:api-token"), btoa("ada:api-token"));
  // The `+` and `/` characters must survive: a url-safe encoder would emit
  // `-` and `_` here, and Jenkins rejects the header.
  assertEquals(encodeBase64("~~~"), "fn5+");
  assertEquals(encodeBase64("~~\x7f"), "fn5/");
});

/**
 * Non-ASCII goes through `TextEncoder` first, so a username or token with an
 * accent encodes as UTF-8 — what Jenkins reads — rather than as the latin1
 * bytes a bare `btoa` would produce.
 */
Deno.test("encodeBase64: encodes non-ASCII as UTF-8, not latin1", () => {
  assertEquals(encodeBase64("é"), "w6k=");
  assert(encodeBase64("é") !== btoa("é"));
});

Deno.test("resolveBaseUrl: reads the instance URL from connection metadata", () => {
  assertEquals(resolveBaseUrl({ endpoint: "https://ci.example.com" }), "https://ci.example.com");
});

/** A trailing slash would produce `//api/json`, which some reverse proxies 404. */
Deno.test("resolveBaseUrl: strips trailing slashes", () => {
  assertEquals(resolveBaseUrl({ endpoint: "https://ci.example.com/" }), "https://ci.example.com");
  assertEquals(resolveBaseUrl({ endpoint: "https://ci.example.com///" }), "https://ci.example.com");
});

/**
 * Jenkins is self-hosted, so there is no host to fall back to — a connection
 * without an endpoint has to fail loudly rather than build a relative URL.
 */
Deno.test("resolveBaseUrl: a connection with no endpoint throws", () => {
  assertThrows(() => resolveBaseUrl(undefined), Error, "missing endpoint");
  assertThrows(() => resolveBaseUrl({}), Error, "missing endpoint");
});

/**
 * Folders and multibranch pipelines are addressed by repeating `job/` once per
 * level. Expanding a `/`-delimited name here is what lets a caller pass
 * `"team/project"` without hand-building the path.
 */
Deno.test("jobPath: expands one `job/` segment per folder level", () => {
  assertEquals(jobPath("my-job"), "job/my-job");
  assertEquals(jobPath("team/project"), "job/team/job/project");
  assertEquals(jobPath("a/b/c"), "job/a/job/b/job/c");
});

Deno.test("jobPath: trims blank segments and encodes each one", () => {
  assertEquals(jobPath(" team / project "), "job/team/job/project");
  assertEquals(jobPath("/team//project/"), "job/team/job/project");
  assertEquals(jobPath("my job"), "job/my%20job");
  assertEquals(jobPath("a/b c"), "job/a/job/b%20c");
});

Deno.test("jobPath: an empty name throws rather than addressing the instance root", () => {
  assertThrows(() => jobPath(""), Error, "must not be empty");
  assertThrows(() => jobPath("///"), Error, "must not be empty");
});

Deno.test("client: fromConnection builds against the connection's endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { jobs: [] } }], { display });
  const client = JenkinsClient.fromConnection(ctx);
  await client.getJson("/api/json");
  assertEquals(calls[0].url, "https://ci.example.com/api/json");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("getJson: drops undefined, null and empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  const client = JenkinsClient.fromConnection(ctx);
  await client.getJson("/api/json", { tree: "jobs[name]", depth: 0, a: undefined, b: null, c: "" });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("tree"), "jobs[name]");
  // `0` is a real value and must survive the empty-string filter.
  assertEquals(url.searchParams.get("depth"), "0");
  assertEquals(url.searchParams.has("a"), false);
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
});

/** Jenkins answers some endpoints with an empty body; that is not a parse error. */
Deno.test("getJson: an empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ body: "" }], { display });
  const client = JenkinsClient.fromConnection(ctx);
  assertEquals(await client.getJson("/api/json"), undefined);
});

/** The vendor's body is the useful half of a failure — it must reach the caller. */
Deno.test("getJson: a non-2xx throws with status, path and body", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: "No such job", headers: {} },
  ], { display });
  const client = JenkinsClient.fromConnection(ctx);
  const err = await client.getJson("/job/missing/api/json").catch((e) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("/job/missing/api/json"), err.message);
  assert(err.message.includes("No such job"), err.message);
});

/**
 * A trigger's payload is the `Location` header, not the body — Jenkins returns
 * 201 with nothing to parse — so `post` reports status + Location instead of
 * trying to read JSON that is not there.
 */
Deno.test("post: returns status and Location, and sends no body without a form", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 201,
      body: "",
      headers: { location: "https://ci.example.com/queue/item/1543/" },
    },
  ], { display });
  const client = JenkinsClient.fromConnection(ctx);
  const result = await client.post("/job/my-job/build");

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(result, { status: 201, location: "https://ci.example.com/queue/item/1543/" });
});

/** `buildWithParameters` expects form encoding, not JSON. */
Deno.test("post: a form is url-encoded, with empty values dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: "", headers: {} }], { display });
  const client = JenkinsClient.fromConnection(ctx);
  await client.post("/job/my-job/buildWithParameters", {
    form: { BRANCH: "main", COUNT: 3, SKIP: undefined, EMPTY: "" },
    query: { delay: "0sec" },
  });

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("BRANCH"), "main");
  assertEquals(body.get("COUNT"), "3");
  assertEquals(body.has("SKIP"), false);
  assertEquals(body.has("EMPTY"), false);
  assertEquals(new URL(calls[0].url).searchParams.get("delay"), "0sec");
});

Deno.test("post: a non-2xx throws with status, path and body", async () => {
  const { ctx } = mockCtx([
    { status: 403, statusText: "Forbidden", body: "No valid crumb", headers: {} },
  ], { display });
  const client = JenkinsClient.fromConnection(ctx);
  const err = await client.post("/job/my-job/build").catch((e) => e as Error);
  assert(err instanceof Error);
  assert(err.message.includes("403"), err.message);
  assert(err.message.includes("/job/my-job/build"), err.message);
  assert(err.message.includes("No valid crumb"), err.message);
});

/** Credentials are the `sign` hook's business; the client must never add them. */
Deno.test("client: sends no Authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  const client = JenkinsClient.fromConnection(ctx);
  await client.getJson("/api/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("parseQueueId: reads the numeric id out of a queue Location", () => {
  assertEquals(parseQueueId("https://ci.example.com/queue/item/1543/"), 1543);
  assertEquals(parseQueueId("https://ci.example.com/queue/item/7"), 7);
});

Deno.test("parseQueueId: anything that is not a queue item is undefined", () => {
  assertEquals(parseQueueId(null), undefined);
  assertEquals(parseQueueId(""), undefined);
  assertEquals(parseQueueId("https://ci.example.com/job/my-job/42/"), undefined);
  assertEquals(parseQueueId("https://ci.example.com/queue/item/abc/"), undefined);
});
