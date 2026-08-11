import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  asJson,
  asOptionalJson,
  compact,
  encodeId,
  extractPageCursor,
  formatProductboardError,
  ProductboardClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import {
  bodyOf,
  errorBody,
  gatewayError,
  listEnvelope,
  mockCtx,
  pathOf,
  queryAll,
  queryOf,
} from "../_helpers.ts";

Deno.test("client: the base URL and prefix are the vendor's single declared server", () => {
  assertEquals(API_BASE, "https://api.productboard.com");
  assertEquals(API_PREFIX, "/v2");
});

Deno.test("client: compact drops empty values but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("client: toList splits a comma string and passes an array through", () => {
  assertEquals(toList("feature, product ,"), ["feature", "product"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("client: asOptionalJson accepts a parsed value or a typed string", () => {
  assertEquals(asOptionalJson<{ a: number }>('{"a":1}', "F"), { a: 1 });
  assertEquals(asOptionalJson<{ a: number }>({ a: 1 }, "F"), { a: 1 });
  assertEquals(asOptionalJson("", "F"), undefined);
});

Deno.test("client: asOptionalJson names the field in its parse error", () => {
  const err = (() => {
    try {
      asOptionalJson("{not json", "Filter");
      return null;
    } catch (e) {
      return e as Error;
    }
  })();
  assert(err?.message.includes("Filter"));
});

Deno.test("client: asJson rejects absence", () => {
  const err = (() => {
    try {
      asJson(undefined, "Fields");
      return null;
    } catch (e) {
      return e as Error;
    }
  })();
  assert(err?.message.includes("Fields is required"));
});

Deno.test("client: encodeId neutralises a pasted path separator", () => {
  assertEquals(encodeId(" abc "), "abc");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("client: truncate reports how much it dropped", () => {
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"));
});

// --- pagination --------------------------------------------------------------

Deno.test("client: extractPageCursor lifts the opaque cursor out of links.next", () => {
  assertEquals(
    extractPageCursor("https://api.productboard.com/v2/notes?pageCursor=abc123"),
    "abc123",
  );
  // The last page carries `null`, not an absent key.
  assertEquals(extractPageCursor(null), undefined);
  assertEquals(extractPageCursor(undefined), undefined);
  // A links.next without the parameter, and a malformed one, must not throw.
  assertEquals(extractPageCursor("https://api.productboard.com/v2/notes"), undefined);
  assertEquals(extractPageCursor("not a url"), undefined);
});

Deno.test("client: list reports hasMore from the cursor, not from the item count", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([], "cur-1") }]);
  const page = await new ProductboardClient(ctx).list("/entities");
  // Zero items but another page: a filter can exclude everything in a window.
  assertEquals(page.items, []);
  assertEquals(page.nextPageCursor, "cur-1");
  assertEquals(page.hasMore, true);
});

Deno.test("client: list reports the last page as hasMore false", async () => {
  const { ctx } = mockCtx([{ body: listEnvelope([{ id: "1" }]) }]);
  const page = await new ProductboardClient(ctx).list<{ id: string }>("/entities");
  assertEquals(page.items.length, 1);
  assertEquals(page.nextPageCursor, undefined);
  assertEquals(page.hasMore, false);
});

// --- request construction ----------------------------------------------------

Deno.test("client: requests go to the v2 prefix with an accept header and no version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new ProductboardClient(ctx).data("/entities/abc");
  assertEquals(calls[0].url, "https://api.productboard.com/v2/entities/abc");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["accept"], "application/json");
  // v2 takes NO X-Version header — that one belongs to the deprecated v1 API.
  assertEquals(calls[0].headers["x-version"], undefined);
});

Deno.test("client: no request ever carries an Authorization header — signing is the auth hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await new ProductboardClient(ctx).data("/entities/abc");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: array query values are repeated keys, not a comma-joined value", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await new ProductboardClient(ctx).list("/entities", {
    query: { "type[]": ["feature", "product"] },
  });
  assertEquals(queryAll(calls[0].url, "type[]"), ["feature", "product"]);
});

Deno.test("client: empty query values are dropped but false survives", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await new ProductboardClient(ctx).list("/entities", {
    query: { archived: false, name: "", missing: undefined, kept: "x" },
  });
  assertEquals(queryOf(calls[0].url), { archived: "false", kept: "x" });
});

Deno.test("client: a JSON body sets content-type and serialises", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1" } } }]);
  await new ProductboardClient(ctx).data("/entities", {
    method: "POST",
    body: { data: { type: "feature" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { data: { type: "feature" } });
});

Deno.test("client: a 204 delete yields the status and no parse attempt", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(
    await new ProductboardClient(ctx).status("/entities/abc", { method: "DELETE" }),
    204,
  );
});

// --- errors ------------------------------------------------------------------

Deno.test("client: the gateway's {message} 401 body is read, not just the documented shape", () => {
  const out = formatProductboardError(
    401,
    "GET",
    "/v2/entities",
    JSON.stringify(gatewayError("Bad token; invalid JSON")),
  );
  assert(out.includes("Bad token; invalid JSON"), out);
  assert(out.includes("401"), out);
});

Deno.test("client: the documented {errors[]} body keeps the machine-readable code", () => {
  const out = formatProductboardError(
    404,
    "GET",
    "/v2/entities/x",
    JSON.stringify(errorBody("resource.notFound", "Resource not found", "It does not exist.")),
  );
  assert(out.includes("resource.notFound"), out);
  assert(out.includes("It does not exist."), out);
  assert(out.includes("req-0000000000"), out);
});

Deno.test("client: a 429 adds the documented per-token ceiling and the backoff advice", () => {
  const out = formatProductboardError(
    429,
    "GET",
    "/v2/entities",
    JSON.stringify(errorBody("rate.limitExceeded", "Rate limit exceeded", "Slow down.")),
  );
  assert(out.includes("50 requests/second"), out);
  assert(out.includes("Retry-After"), out);
});

Deno.test("client: a non-JSON error body is still reported rather than swallowed", () => {
  const out = formatProductboardError(502, "GET", "/v2/entities", "<html>bad gateway</html>");
  assert(out.includes("502"), out);
  assert(out.includes("bad gateway"), out);
});

Deno.test("client: a failed request throws with the classified message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: gatewayError("Unauthorized") }]);
  const err = await assertRejects(
    () => new ProductboardClient(ctx).data("/entities"),
    Error,
  );
  assert(err.message.includes("Unauthorized"), err.message);
  assert(err.message.includes("/v2/entities"), err.message);
});

Deno.test("client: the path reported in an error is the pathname, never the credential-free URL's query", async () => {
  const { ctx } = mockCtx([{ status: 500, body: gatewayError("boom") }]);
  const err = await assertRejects(
    () => new ProductboardClient(ctx).list("/notes", { query: { pageCursor: "secretish" } }),
    Error,
  );
  assertEquals(pathOf("https://api.productboard.com/v2/notes"), "/v2/notes");
  assert(err.message.includes("/v2/notes"), err.message);
  assert(!err.message.includes("secretish"), err.message);
});
