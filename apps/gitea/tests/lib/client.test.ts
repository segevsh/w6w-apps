import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_PATH,
  baseUrlFromConnection,
  compact,
  csv,
  decodeBase64,
  encodeBase64,
  GiteaClient,
  json,
  normalizeBaseUrl,
  resolveRepo,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("the base path is what the document's basePath states", () => {
  assertEquals(API_PATH, "/api/v1");
});

/** A missing scheme must not downgrade a token in flight to plaintext. */
Deno.test("normalizeBaseUrl assumes https and strips everything past the origin", () => {
  assertEquals(normalizeBaseUrl("git.example.com"), "https://git.example.com");
  assertEquals(normalizeBaseUrl("https://git.example.com/"), "https://git.example.com");
  // Gitea's own curl examples end in /api/v1, so a pasted one is plausible.
  assertEquals(normalizeBaseUrl("https://git.example.com/api/v1"), "https://git.example.com");
  assertEquals(normalizeBaseUrl("http://localhost:3000"), "http://localhost:3000");
});

Deno.test("normalizeBaseUrl refuses something that is not a URL", () => {
  assertThrows(() => normalizeBaseUrl(""), Error, "Gitea URL is empty");
  assertThrows(() => normalizeBaseUrl("http://"), Error, "not a valid URL");
});

Deno.test("baseUrlFromConnection explains itself when the URL was never stored", () => {
  assertEquals(baseUrlFromConnection(conn as never), "https://git.example.com");
  assertThrows(
    () => baseUrlFromConnection({ display: {} } as never),
    Error,
    "records no instance URL",
  );
});

/** `owner/name` is how people write it everywhere else, so both forms work. */
Deno.test("resolveRepo accepts owner/name and a bare name with a default", () => {
  assertEquals(resolveRepo(conn as never, "acme/web"), { owner: "acme", repo: "web" });
  assertEquals(resolveRepo(conn as never, "web"), { owner: "acme", repo: "web" });
  assertEquals(resolveRepo(conn as never, "web", "other"), { owner: "other", repo: "web" });
  // An explicit owner/name wins over both the override and the connection.
  assertEquals(resolveRepo(conn as never, "them/web", "other"), { owner: "them", repo: "web" });
});

Deno.test("resolveRepo refuses a name it cannot resolve or parse", () => {
  assertThrows(() => resolveRepo(conn as never, ""), Error, "`repo` is required");
  assertThrows(
    () => resolveRepo({ display: {} } as never, "web"),
    Error,
    'no owner for "web"',
  );
  assertThrows(
    () => resolveRepo(conn as never, "a/b/c"),
    Error,
    'should be "name" or "owner/name"',
  );
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
});

/**
 * `btoa` throws above U+00FF, so a naive encode fails on any non-ASCII commit —
 * with an error about characters rather than encoding.
 */
Deno.test("base64 round-trips text that btoa alone would reject", () => {
  for (const text of ["hello", "こんにちは", "a — b", "🎉 ship it"]) {
    assertEquals(decodeBase64(encodeBase64(text)), text);
  }
});

Deno.test("decodeBase64 tolerates the newlines Gitea wraps long content in", () => {
  const encoded = encodeBase64("hello world");
  const wrapped = `${encoded.slice(0, 4)}\n${encoded.slice(4)}`;
  assertEquals(decodeBase64(wrapped), "hello world");
});

Deno.test("client: builds paths on the connection's instance, under /api/v1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await new GiteaClient(ctx).request("/repos/acme/web/issues", { query: { state: "open" } });
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/issues?state=open");
});

Deno.test("client: never sends Authorization — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new GiteaClient(ctx).request("/user");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a failure surfaces the status and Gitea's envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: { message: "user redirect does not exist", url: "https://git.example.com/api/swagger" },
  }], conn);
  const err = await assertRejects(
    async () => await new GiteaClient(ctx).request("/repos/acme/nope"),
    Error,
  );
  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("does not exist"), err.message);
});

Deno.test("client: a connection with no URL fails before any request", () => {
  const { ctx } = mockCtx([], { display: {} });
  assertThrows(() => new GiteaClient(ctx), Error, "records no instance URL");
});

/** Bare arrays, 1-based pages, and a short page is the only end signal. */
Deno.test("requestAll pages 1-based and stops on a short page", async () => {
  const full = Array.from({ length: 50 }, (_, i) => ({ number: i }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: full },
    { status: 200, body: [{ number: 99 }] },
  ], conn);
  const all = await new GiteaClient(ctx).requestAll("/repos/acme/web/issues");
  assertEquals(all.length, 51);
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "1");
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("requestAll asks for no more than it wants, capped at 50", async () => {
  const small = mockCtx([{ status: 200, body: [] }], conn);
  await new GiteaClient(small.ctx).requestAll("/x", {}, 5);
  assertEquals(new URL(small.calls[0].url).searchParams.get("limit"), "5");

  const big = mockCtx([{ status: 200, body: [] }], conn);
  await new GiteaClient(big.ctx).requestAll("/x", {}, Infinity);
  assertEquals(new URL(big.calls[0].url).searchParams.get("limit"), "50");
});
