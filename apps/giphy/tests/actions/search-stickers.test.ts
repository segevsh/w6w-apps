import { assertEquals } from "@std/assert";
import searchStickers from "../../actions/search-stickers.ts";
import { envelope, gif, mockCtx, PAGINATION_FIXTURE, pathOf, queryOf } from "../_helpers.ts";

Deno.test("search-stickers: calls GET /v1/stickers/search", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([gif("sticker-1")], { pagination: PAGINATION_FIXTURE }) },
  ]);
  const out = await searchStickers.execute({ q: "thumbs up", limit: 5 }, ctx) as {
    data: Array<{ id: string }>;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/stickers/search");
  assertEquals(queryOf(calls[0].url), { q: "thumbs up", limit: "5" });
  assertEquals(out.data[0].id, "sticker-1");
});

Deno.test("search-stickers: rating and offset are forwarded, lang is not offered", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await searchStickers.execute({ q: "hi", offset: 50, rating: "r" }, ctx);

  assertEquals(queryOf(calls[0].url), { q: "hi", offset: "50", rating: "r" });
  assertEquals(searchStickers.params?.find((p) => p.key === "lang"), undefined);
});

Deno.test("search-stickers: it is a search action with a required q", () => {
  assertEquals(searchStickers.type, "search");
  assertEquals(searchStickers.params?.find((p) => p.key === "q")?.required, true);
  assertEquals(searchStickers.params?.find((p) => p.key === "limit")?.default, 25);
});
