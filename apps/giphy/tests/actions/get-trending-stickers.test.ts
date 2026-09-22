import { assertEquals } from "@std/assert";
import getTrendingStickers from "../../actions/get-trending-stickers.ts";
import { envelope, gif, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-trending-stickers: calls GET /v1/stickers/trending", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([gif("sticker-2")]) }]);
  const out = await getTrendingStickers.execute({ limit: 1 }, ctx) as {
    data: Array<{ id: string }>;
  };

  assertEquals(pathOf(calls[0].url), "/v1/stickers/trending");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(out.data[0].id, "sticker-2");
});

Deno.test("get-trending-stickers: a bare call sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await getTrendingStickers.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(getTrendingStickers.type, "read");
});
