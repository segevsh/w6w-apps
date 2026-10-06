import { assertEquals, assertRejects } from "@std/assert";
import {
  buildUrl,
  call,
  cursorList,
  encodeId,
  errorInfo,
  list,
  MemError,
  pageList,
  pick,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: errorInfo reads the platform, quota and plain envelopes", () => {
  assertEquals(errorInfo({ error_metadata: { error_kind: "NOT_AUTHORIZED", message: "m" } }), {
    kind: "NOT_AUTHORIZED",
    message: "m",
  });
  assertEquals(errorInfo({ error: { type: "quota_exceeded", message: "q" } }), {
    kind: "quota_exceeded",
    message: "q",
  });
  assertEquals(errorInfo({ error: "s" }), { message: "s" });
  assertEquals(errorInfo({ detail: "d" }), { message: "d" });
  assertEquals(errorInfo(null), {});
});

Deno.test("client: a 429 quota error carries its type and message", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { type: "quota_exceeded", message: "free tier limit" } },
  }]);
  const err = await assertRejects(
    () => call(ctx, "POST", "/v2/notes", { body: { content: "x" } }),
    MemError,
  );
  assertEquals(err.status, 429);
  assertEquals(err.errorKind, "quota_exceeded");
  assertEquals(err.message.includes("free tier limit"), true);
});

Deno.test("client: encodeId trims, encodes and refuses empty", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  try {
    encodeId("  ");
    throw new Error("no throw");
  } catch (e) {
    assertEquals((e as Error).message, "A required ID was empty");
  }
});

Deno.test("client: buildUrl and pick drop unset values", () => {
  assertEquals(
    buildUrl("/v2/x", { a: 1, b: undefined, c: "", d: false }),
    "https://api.mem.ai/v2/x?a=1&d=false",
  );
  assertEquals(pick({ a: 1, b: null, c: "", d: 0 }, ["a", "b", "c", "d"]), { a: 1, d: 0 });
});

Deno.test("client: list splits comma and newline text and passes arrays", () => {
  assertEquals(list("a, b\nc,,"), ["a", "b", "c"]);
  assertEquals(list([" x ", "y"]), ["x", "y"]);
  assertEquals(list(""), undefined);
  assertEquals(list(" , "), undefined);
});

Deno.test("client: pagination shapes", () => {
  assertEquals(pageList({ results: [1], total: 5, next_page: "c" }), {
    items: [1],
    total: 5,
    nextPage: "c",
    hasMore: true,
  });
  assertEquals(pageList({}).hasMore, false);
  assertEquals(
    cursorList({ results: [], has_next_page: true, next_page_cursor: "z" }).nextPageCursor,
    "z",
  );
});

Deno.test("client: a non-JSON error body is still reported", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "bad gateway" }]);
  const err = await assertRejects(() => call(ctx, "GET", "/v2/notes"), MemError);
  assertEquals(err.message.includes("bad gateway"), true);
});
