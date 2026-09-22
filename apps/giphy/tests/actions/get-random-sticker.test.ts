import { assertEquals } from "@std/assert";
import getRandomSticker from "../../actions/get-random-sticker.ts";
import { envelope, gif, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-random-sticker: calls GET /v1/stickers/random and returns one object", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif("sticker-3")) }]);
  const out = await getRandomSticker.execute({ tag: "hello" }, ctx) as {
    data: { id: string };
  };

  assertEquals(pathOf(calls[0].url), "/v1/stickers/random");
  assertEquals(queryOf(calls[0].url), { tag: "hello" });
  assertEquals(Array.isArray(out.data), false);
  assertEquals(out.data.id, "sticker-3");
});

Deno.test("get-random-sticker: rating is forwarded alongside the tag", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  await getRandomSticker.execute({ tag: "hi", rating: "pg" }, ctx);
  assertEquals(queryOf(calls[0].url), { tag: "hi", rating: "pg" });
});
