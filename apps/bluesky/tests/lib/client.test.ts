import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  BlueskyClient,
  compact,
  csv,
  DEFAULT_SERVICE,
  describeXrpc,
  didFromConnection,
  json,
  normalizeService,
  parseAtUri,
  postUri,
  query,
  webLinkToAtUri,
} from "../../lib/client.ts";

const display = { service: "https://bsky.social", did: "did:plc:me", handle: "me.bsky.social" };

Deno.test("normalizeService: fills in a scheme and keeps a custom PDS", () => {
  assertEquals(normalizeService(""), DEFAULT_SERVICE);
  assertEquals(normalizeService("pds.example.com"), "https://pds.example.com");
  assertEquals(normalizeService("https://pds.example.com:3000"), "https://pds.example.com:3000");
  assertThrows(() => normalizeService("not a url"), Error);
});

/** Everything a write does needs the repository's DID. */
Deno.test("didFromConnection: a connection without a DID says to reconnect", () => {
  assertEquals(didFromConnection({ display } as never), "did:plc:me");
  const error = assertThrows(() => didFromConnection({ display: {} } as never), Error);
  assert(/reconnect it/.test(error.message), error.message);
});

Deno.test("parseAtUri: splits the three parts a deleteRecord needs", () => {
  assertEquals(parseAtUri("at://did:plc:abc/app.bsky.feed.post/3k2a", "uri"), {
    did: "did:plc:abc",
    collection: "app.bsky.feed.post",
    rkey: "3k2a",
  });
});

/** The error has to point at the value people actually have. */
Deno.test("parseAtUri: a web link alone is refused, and the message says what to use", () => {
  const error = assertThrows(
    () => parseAtUri("https://bsky.app/profile/me.bsky.social/post/3k2a", "uri"),
    Error,
  );
  assert(/AT-URI/.test(error.message), error.message);
  assert(/not the bsky.app web link/.test(error.message), error.message);
});

/** Pasting a link from the browser is what people have, so it is accepted. */
Deno.test("webLinkToAtUri: converts a bsky.app post link", () => {
  assertEquals(
    webLinkToAtUri("https://bsky.app/profile/me.bsky.social/post/3k2a"),
    "at://me.bsky.social/app.bsky.feed.post/3k2a",
  );
  assertEquals(webLinkToAtUri("https://example.com/whatever"), undefined);
});

Deno.test("postUri: takes either form and normalises to one", () => {
  assertEquals(
    postUri("https://bsky.app/profile/me.bsky.social/post/3k2a", "uri").uri,
    "at://me.bsky.social/app.bsky.feed.post/3k2a",
  );
  assertEquals(postUri("at://did:plc:abc/app.bsky.feed.post/3k2a", "uri").rkey, "3k2a");
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [], e: false }), { a: 1, e: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

Deno.test("call: builds the XRPC path under the connection's own PDS", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }], { display });
  await new BlueskyClient(ctx).call("app.bsky.actor.getProfile", { query: { actor: "a.b" } });
  assertEquals(
    calls[0].url,
    "https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=a.b",
  );
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("call: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new BlueskyClient(ctx).call("app.bsky.actor.getProfile");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("createRecord and deleteRecord write to the connection's own repo", async () => {
  const created = mockCtx([{ status: 200, body: { uri: "at://x", cid: "c" } }], { display });
  await new BlueskyClient(created.ctx).createRecord("app.bsky.feed.post", { text: "hi" });
  const createBody = JSON.parse(created.calls[0].body!);
  assertEquals(createBody.repo, "did:plc:me");
  assertEquals(createBody.collection, "app.bsky.feed.post");

  const deleted = mockCtx([{ status: 200, body: {} }], { display });
  await new BlueskyClient(deleted.ctx).deleteRecord("app.bsky.feed.like", "3k9z");
  // By repo/collection/rkey — there is no delete-by-URI.
  assertEquals(JSON.parse(deleted.calls[0].body!), {
    repo: "did:plc:me",
    collection: "app.bsky.feed.like",
    rkey: "3k9z",
  });
});

/**
 * `searchPosts` without a token answers with an HTML page from an edge proxy.
 * "Unexpected token <" points nowhere near the cause.
 */
Deno.test("describeXrpc: a non-JSON body is named as an edge proxy, not a parse failure", () => {
  const message = describeXrpc(403, "<html><head><title>403 Forbidden</title>");
  assert(/non-JSON body/.test(message), message);
  assert(/edge proxy/.test(message), message);
});

Deno.test("describeXrpc: an expired token is distinguished from a bad password", () => {
  const expired = describeXrpc(400, JSON.stringify({ error: "ExpiredToken", message: "expired" }));
  assert(/refreshes it automatically/.test(expired), expired);

  const bad = describeXrpc(
    401,
    JSON.stringify({ error: "AuthenticationRequired", message: "Invalid identifier or password" }),
  );
  assert(/APP PASSWORD/.test(bad), bad);
});

/** The limit that strands a connection deserves naming wherever it can bite. */
Deno.test("describeXrpc: a rate limit names the ten-per-day session budget", () => {
  const message = describeXrpc(429, JSON.stringify({ error: "RateLimitExceeded" }));
  assert(/ten per day/.test(message), message);
  assert(/refreshing/.test(message), message);
});

/** The single most common AT Protocol mistake. */
Deno.test("describeXrpc: a missing record points at the like-vs-post URI confusion", () => {
  const message = describeXrpc(
    400,
    JSON.stringify({ error: "InvalidRequest", message: "Could not locate record: not found" }),
  );
  assert(/URI of the LIKE record/.test(message), message);
});

Deno.test("call: a failing request carries the method name and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error: "InvalidRequest", message: "nope" } }], {
    display,
  });
  let message = "";
  try {
    await new BlueskyClient(ctx).call("app.bsky.feed.getPosts");
  } catch (err) {
    message = String(err);
  }
  assert(/app.bsky.feed.getPosts/.test(message), message);
  assert(/nope/.test(message), message);
});
