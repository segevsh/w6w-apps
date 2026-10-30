import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import {
  compact,
  csv,
  homeserverUrlFromConnection,
  MatrixClient,
  matrixErrorMessage,
  normalizeHomeserverUrl,
  parseMatrixError,
  seg,
  userIdFromConnection,
} from "../../lib/client.ts";
import { matrixError, mockMatrixCtx } from "../_helpers.ts";

test("normalizeHomeserverUrl: reduces every plausible paste to one origin", () => {
  const expected = "https://matrix.org";
  assertEquals(normalizeHomeserverUrl("https://matrix.org"), expected);
  assertEquals(normalizeHomeserverUrl("https://matrix.org/"), expected);
  assertEquals(normalizeHomeserverUrl("  https://matrix.org/_matrix/client/v3  "), expected);
});

test("normalizeHomeserverUrl: bare hostnames become https, explicit http is honoured", () => {
  assertEquals(normalizeHomeserverUrl("matrix.org"), "https://matrix.org");
  assertEquals(normalizeHomeserverUrl("http://localhost:8008"), "http://localhost:8008");
});

test("normalizeHomeserverUrl: rejects empty and unparseable input", () => {
  assertThrows(() => normalizeHomeserverUrl(""), Error, "empty");
  assertThrows(() => normalizeHomeserverUrl("https://"), Error);
});

test("homeserverUrlFromConnection: reads display, and says so when it is missing", () => {
  const { ctx } = mockMatrixCtx();
  assertEquals(homeserverUrlFromConnection(ctx.connection), "https://matrix.example.org");
  assertThrows(() => homeserverUrlFromConnection(undefined), Error, "records no homeserver URL");
});

test("userIdFromConnection: reads display, and says so when it is missing", () => {
  const { ctx } = mockMatrixCtx();
  assertEquals(userIdFromConnection(ctx.connection), "@alice:example.org");
  assertThrows(() => userIdFromConnection(undefined), Error, "records no user id");
});

test("seg: percent-encodes Matrix identifiers for a URL path segment", () => {
  // `!` is one of encodeURIComponent's unreserved characters and stays literal;
  // `:`, `@` and `#` — all significant in a URL — are what actually need escaping.
  assertEquals(seg("!abc:example.org"), "!abc%3Aexample.org");
  assertEquals(seg("@alice:example.org"), "%40alice%3Aexample.org");
  assertEquals(seg("#room:example.org"), "%23room%3Aexample.org");
});

test("parseMatrixError: recognises the standard envelope, and only that shape", () => {
  assertEquals(parseMatrixError(JSON.stringify(matrixError("M_FORBIDDEN", "nope"))), {
    errcode: "M_FORBIDDEN",
    error: "nope",
  });
  assertEquals(parseMatrixError("not json"), null);
  assertEquals(parseMatrixError('{"foo": "bar"}'), null);
  assertEquals(parseMatrixError(""), null);
});

test("matrixErrorMessage: renders errcode + message, or falls back to raw text", () => {
  assertEquals(
    matrixErrorMessage(JSON.stringify(matrixError("M_UNKNOWN_TOKEN", "bad token"))),
    "M_UNKNOWN_TOKEN: bad token",
  );
  assertEquals(matrixErrorMessage("<html>gateway timeout</html>"), "<html>gateway timeout</html>");
});

test("compact: drops unset keys but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

test("csv: accepts an array, a bare string, or a comma-separated string", () => {
  assertEquals(csv(["@a:x", "@b:x"]), ["@a:x", "@b:x"]);
  assertEquals(csv("@a:x, @b:x ,@c:x"), ["@a:x", "@b:x", "@c:x"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(","), undefined);
});

test("MatrixClient: resolves the homeserver from the Connection and builds under /_matrix/client/v3", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: { joined_rooms: [] } }]);
  const client = new MatrixClient(ctx);
  await client.request("/joined_rooms");
  assertEquals(calls[0].url, "https://matrix.example.org/_matrix/client/v3/joined_rooms");
  assertEquals(calls[0].method, "GET");
});

test("MatrixClient: PUT/POST bodies are JSON-encoded with a content-type", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: { room_id: "!x:example.org" } }]);
  const client = new MatrixClient(ctx);
  await client.request("/createRoom", { method: "POST", body: { name: "Test" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Test" });
});

test("MatrixClient: query params are appended, undefined/null/empty dropped", async () => {
  const { ctx, calls } = mockMatrixCtx([{ body: { chunk: [] } }]);
  const client = new MatrixClient(ctx);
  await client.request("/rooms/!x:example.org/messages", {
    query: { dir: "b", limit: 5, from: undefined, to: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("dir"), "b");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.has("from"), false);
  assertEquals(url.searchParams.has("to"), false);
});

test("MatrixClient: a non-ok response surfaces the errcode, not just the status", async () => {
  const { ctx } = mockMatrixCtx([
    { status: 403, body: matrixError("M_FORBIDDEN", "you are not in the room") },
  ]);
  const client = new MatrixClient(ctx);
  await assertRejects(
    () => client.request("/rooms/!x:example.org/invite", { method: "POST", body: {} }),
    Error,
    "M_FORBIDDEN: you are not in the room",
  );
});

test("MatrixClient: an empty 200 body decodes to undefined, not a JSON parse error", async () => {
  const { ctx } = mockMatrixCtx([{ status: 200, body: undefined }]);
  const client = new MatrixClient(ctx);
  const result = await client.request("/rooms/!x:example.org/leave", { method: "POST", body: {} });
  assertEquals(result, undefined);
});
