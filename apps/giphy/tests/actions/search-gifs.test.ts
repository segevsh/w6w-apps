import { assertEquals } from "@std/assert";
import searchGifs from "../../actions/search-gifs.ts";
import {
  API_ROOT,
  envelope,
  gif,
  mockCtx,
  PAGINATION_FIXTURE,
  pathOf,
  queryOf,
} from "../_helpers.ts";

Deno.test("search-gifs: calls GET /v1/gifs/search and unwraps data + pagination", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([gif()], { pagination: PAGINATION_FIXTURE }) },
  ]);
  const out = await searchGifs.execute({ q: "happy dance" }, ctx) as {
    data: Array<{ id: string }>;
    pagination: unknown;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${API_ROOT}/gifs/search`), true, calls[0].url);
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(queryOf(calls[0].url), { q: "happy dance" });
  assertEquals(out.data[0].id, "abc123");
  assertEquals(out.pagination, PAGINATION_FIXTURE);
});

Deno.test("search-gifs: every optional param reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await searchGifs.execute(
    { q: "cat", limit: 10, offset: 20, rating: "pg-13", lang: "en_US" },
    ctx,
  );

  assertEquals(queryOf(calls[0].url), {
    q: "cat",
    limit: "10",
    offset: "20",
    rating: "pg-13",
    lang: "en_US",
  });
});

Deno.test("search-gifs: the action never sends the credential itself", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await searchGifs.execute({ q: "cat" }, ctx);
  assertEquals(Object.keys(queryOf(calls[0].url)).includes("api_key"), false);
});

Deno.test("search-gifs: q is required and capped at GIPHY's 50-character limit", () => {
  const q = searchGifs.params?.find((p) => p.key === "q");
  assertEquals(q?.required, true);
  assertEquals(q?.validation?.maxLength, 50);

  // GIPHY's documented default for this endpoint.
  assertEquals(searchGifs.params?.find((p) => p.key === "limit")?.default, 25);
});

Deno.test("search-gifs: an empty result set is passed through as an empty array", async () => {
  const { ctx } = mockCtx([{ body: envelope([]) }]);
  const out = await searchGifs.execute({ q: "nothing at all" }, ctx) as { data: unknown[] };
  assertEquals(out.data, []);
});

Deno.test("search-gifs: a non-200 meta.status throws, carrying GIPHY's message", async () => {
  const { ctx } = mockCtx([
    { status: 429, body: { data: [], meta: { status: 429, msg: "Too Many Requests" } } },
  ]);
  let message = "";
  try {
    await searchGifs.execute({ q: "cat" }, ctx);
  } catch (err) {
    message = String(err);
  }
  // 429 arrives as a non-200 meta.status, and the fix is stated rather than the code alone.
  assertEquals(message.includes("429"), true, message);
  assertEquals(message.includes("/v1/gifs/search"), true, message);
});

Deno.test("search-gifs: the path is the documented one", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await searchGifs.execute({ q: "x" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/gifs/search");
});
