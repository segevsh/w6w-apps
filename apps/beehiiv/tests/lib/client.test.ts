import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  asOptionalJson,
  BeehiivClient,
  compact,
  formatBeehiivError,
  rawFetch,
  toList,
  truncate,
} from "../../lib/client.ts";
import { INVALID_API_KEY_401, mockCtx } from "../_helpers.ts";

Deno.test("client: the base is beehiiv's single declared host and version prefix", () => {
  assertEquals(API_BASE, "https://api.beehiiv.com");
  assertEquals(API_PREFIX, "/v2");
});

Deno.test("client: data() unwraps the {data: ...} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "pub_1", name: "Acme" } } }]);
  const out = await new BeehiivClient(ctx).data("/publications/pub_1");

  assertEquals(out, { id: "pub_1", name: "Acme" });
  assertEquals(calls[0].url, "https://api.beehiiv.com/v2/publications/pub_1");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

Deno.test("client: list() returns the full offset-pagination envelope unwrapped", async () => {
  const { ctx } = mockCtx([{
    body: { data: [{ id: "post_1" }], page: 1, limit: 10, total_results: 1, total_pages: 1 },
  }]);
  const out = await new BeehiivClient(ctx).list("/publications/pub_1/posts");
  assertEquals(out.data.length, 1);
  assertEquals(out.total_pages, 1);
});

Deno.test("client: cursorList() returns the cursor-pagination envelope unwrapped", async () => {
  const { ctx } = mockCtx([{ body: { data: [], limit: 10, has_more: true, next_cursor: "abc" } }]);
  const out = await new BeehiivClient(ctx).cursorList("/publications/pub_1/subscriptions");
  assertEquals(out.has_more, true);
  assertEquals(out.next_cursor, "abc");
});

Deno.test("client: send() array query values are repeated keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new BeehiivClient(ctx).list("/publications/pub_1/posts", {
    query: { "content_tags[]": ["a", "b"] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("content_tags[]"), ["a", "b"]);
});

Deno.test("client: send() drops query values that are empty, null or undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new BeehiivClient(ctx).list("/publications/pub_1/posts", {
    query: { expand: "", page: undefined, limit: 10 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("expand"), false);
  assertEquals(url.searchParams.has("page"), false);
  assertEquals(url.searchParams.get("limit"), "10");
});

Deno.test("client: send() sends a JSON body with the content-type header on write", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "sub_1" } } }]);
  await new BeehiivClient(ctx).data("/publications/pub_1/subscriptions", {
    method: "POST",
    body: { email: "a@b.com" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
});

Deno.test("client: send() never sets Authorization itself — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new BeehiivClient(ctx).data("/publications/pub_1");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a non-2xx response throws, carrying the vendor's structured error", async () => {
  const { ctx } = mockCtx([INVALID_API_KEY_401]);
  await assertRejects(
    () => new BeehiivClient(ctx).data("/publications/pub_1"),
    Error,
    "INVALID_API_KEY",
  );
});

Deno.test("client: status(path) returns the raw status for a 204-with-no-body endpoint", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const status = await new BeehiivClient(ctx).status("/publications/pub_1/posts/post_1", {
    method: "DELETE",
  });
  assertEquals(status, 204);
});

Deno.test("client: json() returns undefined for an empty 204 body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new BeehiivClient(ctx).json("/publications/pub_1/posts/post_1", {
    method: "DELETE",
  });
  assertEquals(out, undefined);
});

Deno.test("rawFetch: never throws on a non-2xx status — the caller inspects it", async () => {
  const { ctx } = mockCtx([{ status: 202, body: { data: { id: "post_1", state: "pending" } } }]);
  const { status, body } = await rawFetch(ctx, "/publications/pub_1/posts/post_1");
  assertEquals(status, 202);
  assertEquals((body as { data: { state: string } }).data.state, "pending");
});

Deno.test("rawFetch: array query values are repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await rawFetch(ctx, "/publications/pub_1/posts/post_1", { query: { "expand[]": ["stats"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("expand[]"), ["stats"]);
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  const out: Record<string, unknown> = compact({
    a: undefined,
    b: null,
    c: "",
    d: false,
    e: 0,
    f: "x",
  });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("toList: splits a comma-string, passes an array through, drops empties", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes a non-string through, rejects garbage", () => {
  assertEquals(asOptionalJson('{"a":1}', "field"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "field"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "field"), undefined);
  assertEquals(asOptionalJson("", "field"), undefined);
  let threw = false;
  try {
    asOptionalJson("not json", "field");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("field"));
  }
  assert(threw);
});

Deno.test("truncate: leaves a short string alone, truncates a long one with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long);
  assert(out.length < long.length);
  assert(out.includes("truncated"));
});

Deno.test("formatBeehiivError: surfaces the vendor's stable error code and message", () => {
  const msg = formatBeehiivError(
    401,
    "GET",
    "/v2/publications",
    JSON.stringify({ errors: [{ code: "INVALID_API_KEY", message: "The api key is not valid" }] }),
  );
  assertEquals(
    msg,
    "beehiiv 401 for GET /v2/publications: INVALID_API_KEY: The api key is not valid",
  );
});

Deno.test("formatBeehiivError: joins multiple errors and falls back to the raw body", () => {
  const joined = formatBeehiivError(
    422,
    "POST",
    "/v2/publications/pub_1/posts",
    JSON.stringify({
      errors: [{ code: "A", message: "bad a" }, { code: "B", message: "bad b" }],
    }),
  );
  assert(joined.includes("A: bad a"));
  assert(joined.includes("B: bad b"));

  const fallback = formatBeehiivError(500, "GET", "/v2/publications", "<html>gateway error</html>");
  assert(fallback.includes("500"));
  assert(fallback.includes("<html>gateway error</html>"));
});
