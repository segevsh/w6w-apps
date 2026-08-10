import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { API, gqlError, gqlOf, mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  API_URL,
  BufferClient,
  compact,
  formatGraphQLErrors,
  idList,
  isCredentialError,
  jsonObject,
  parseGraphQLBody,
  unset,
  unwrapMutation,
} from "../../lib/client.ts";

Deno.test("client: the base URL is the bare origin, as Buffer's examples document", () => {
  assertEquals(API_HOST, "api.buffer.com");
  assertEquals(API_URL, "https://api.buffer.com");
  // Not `/graphql` — that alias answers identically but is undocumented.
  assert(!API_URL.endsWith("/graphql"));
});

Deno.test("client: POSTs the query and variables as JSON, and sets no Authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { ok: true } } }]);
  await new BufferClient(ctx).request("query X { ok }", { a: 1 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, API);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(gqlOf(calls[0]), { query: "query X { ok }", variables: { a: 1 } });
  // The credential is `sign`'s business, never the client's.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: variables are sent separately, never interpolated into the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new BufferClient(ctx).request("query X($id: ID!) { post(id: $id) { id } }", {
    id: "abc123",
  });
  assert(!gqlOf(calls[0]).query.includes("abc123"), "value leaked into the query document");
});

/* ---------------- the three failure arms ---------------- */

Deno.test("client: arm 1 — a real non-2xx throws", () => {
  assertThrows(
    () => parseGraphQLBody(500, JSON.stringify({ data: null })),
    Error,
    "HTTP 500",
  );
});

Deno.test("client: arm 1 — a non-JSON body names the status rather than exploding", () => {
  assertThrows(
    () => parseGraphQLBody(502, "<html>Bad gateway</html>"),
    Error,
    "non-JSON body",
  );
});

Deno.test("client: arm 2 — HTTP 200 with an errors array is a failure, not data", async () => {
  const { ctx } = mockCtx([gqlError("Not authorized", "UNAUTHORIZED")]);
  const err = await assertRejects(
    () => new BufferClient(ctx).request("query X { ok }"),
    Error,
  );
  assert(/Not authorized/.test(err.message), err.message);
  assert(/UNAUTHORIZED/.test(err.message), err.message);
});

Deno.test("client: arm 2 — the errors array wins over the status line on a 429", () => {
  // Buffer sends both. The body is the half that says which window blew.
  const body = JSON.stringify({
    errors: [{
      message: "Too many requests from this client. Please try again later.",
      extensions: { code: "RATE_LIMIT_EXCEEDED", window: "15m" },
    }],
  });
  const err = assertThrows(() => parseGraphQLBody(429, body), Error);
  assert(/RATE_LIMIT_EXCEEDED/.test(err.message), err.message);
  assert(/window 15m/.test(err.message), err.message);
  assert(!/HTTP 429/.test(err.message), "the generic status message should not win");
});

Deno.test("client: arm 3 — a mutation error arm arrives 200 with no errors array", async () => {
  // Buffer's own documented example, verbatim.
  const { ctx } = mockCtx([
    {
      body: {
        data: { createPost: { __typename: "InvalidInputError", message: "Text is required" } },
      },
    },
  ]);
  const err = await assertRejects(
    () =>
      new BufferClient(ctx).mutate("mutation M { createPost { __typename } }", {}, "createPost", [
        "PostActionSuccess",
      ]),
    Error,
  );
  assert(/Text is required/.test(err.message), err.message);
  assert(/InvalidInputError/.test(err.message), err.message);
});

Deno.test("client: arm 3 — a success arm is returned unchanged", async () => {
  const { ctx } = mockCtx([
    { body: { data: { createPost: { __typename: "PostActionSuccess", post: { id: "p1" } } } } },
  ]);
  const out = await new BufferClient(ctx).mutate<{ post: { id: string } }>(
    "mutation M { createPost { __typename } }",
    {},
    "createPost",
    ["PostActionSuccess"],
  );
  assertEquals(out.post.id, "p1");
});

Deno.test("client: neither data nor errors is a failure, not an empty success", () => {
  assertThrows(() => parseGraphQLBody(200, JSON.stringify({})), Error, "neither");
});

/* ---------------- unwrapMutation edge cases ---------------- */

Deno.test("unwrapMutation: RestProxyError surfaces the network's link and code", () => {
  const err = assertThrows(
    () =>
      unwrapMutation(
        {
          __typename: "RestProxyError",
          message: "Instagram rejected the image",
          link: "https://support.buffer.com/article/123",
          code: 42,
        },
        "createPost",
        ["PostActionSuccess"],
      ),
    Error,
  );
  assert(/Instagram rejected the image/.test(err.message), err.message);
  assert(/code 42/.test(err.message), err.message);
  assert(/support\.buffer\.com/.test(err.message), err.message);
});

Deno.test("unwrapMutation: a missing __typename is an error, never an optimistic success", () => {
  assertThrows(
    () => unwrapMutation({ post: { id: "p1" } }, "createPost", ["PostActionSuccess"]),
    Error,
    "unrecognised response shape",
  );
});

Deno.test("unwrapMutation: a null payload is an error", () => {
  assertThrows(
    () => unwrapMutation(null, "deletePost", ["DeletePostSuccess"]),
    Error,
    "no payload",
  );
});

Deno.test("unwrapMutation: several success types are all accepted", () => {
  // createIdea resolves to `Idea` OR `IdeaResponse`.
  const idea = unwrapMutation({ __typename: "Idea", id: "i1" }, "createIdea", [
    "Idea",
    "IdeaResponse",
  ]);
  assertEquals((idea as { id: string }).id, "i1");
  const wrapped = unwrapMutation({ __typename: "IdeaResponse", idea: { id: "i2" } }, "createIdea", [
    "Idea",
    "IdeaResponse",
  ]);
  assertEquals((wrapped as { idea: { id: string } }).idea.id, "i2");
});

/* ---------------- error rendering ---------------- */

Deno.test("formatGraphQLErrors: reports the count when there are several", () => {
  const msg = formatGraphQLErrors([
    { message: "first", extensions: { code: "NOT_FOUND" } },
    { message: "second" },
  ]);
  assert(/first/.test(msg));
  assert(/NOT_FOUND/.test(msg));
  assert(/\+1 more/.test(msg));
});

Deno.test("isCredentialError: accepts both the documented and the observed spelling", () => {
  // The docs table says UNAUTHORIZED; the live API returns UNAUTHENTICATED.
  assert(isCredentialError("UNAUTHENTICATED"));
  assert(isCredentialError("UNAUTHORIZED"));
  assert(!isCredentialError("FORBIDDEN"));
  assert(!isCredentialError(undefined));
});

/* ---------------- helpers ---------------- */

Deno.test("compact: drops blanks but keeps false and 0", () => {
  assertEquals(
    compact({ a: "", b: null, c: undefined, d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("compact: keeps an explicit empty array — on editPost that means 'clear'", () => {
  assertEquals(compact({ assets: [] }), { assets: [] });
});

Deno.test("idList: trims, drops blanks, and never coerces a Buffer id to a number", () => {
  assertEquals(idList(" a1 , b2 ,, c3 "), ["a1", "b2", "c3"]);
  // A Buffer id is an opaque string; Number() would turn it into NaN.
  assertEquals(idList("507f1f77bcf86cd799439011"), ["507f1f77bcf86cd799439011"]);
});

Deno.test("idList: whitespace yields undefined, not [] — they are opposite instructions", () => {
  // aggregatedPostMetrics: omitted spans every channel, `[]` matches none.
  assertEquals(idList("   "), undefined);
  assertEquals(idList(""), undefined);
  assertEquals(idList(undefined), undefined);
});

Deno.test("unset: a blank string is absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

Deno.test("jsonObject: parses a string, passes an object, rejects an array", () => {
  assertEquals(jsonObject('{"a":1}', "M"), { a: 1 });
  assertEquals(jsonObject({ a: 1 }, "M"), { a: 1 });
  assertEquals(jsonObject("", "M"), undefined);
  assertThrows(() => jsonObject("[1]", "M"), Error, "must be a JSON object");
  assertThrows(() => jsonObject("{oops", "M"), Error, "not valid JSON");
});
