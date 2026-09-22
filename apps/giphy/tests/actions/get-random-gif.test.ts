import { assertEquals } from "@std/assert";
import getRandomGif from "../../actions/get-random-gif.ts";
import { envelope, gif, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("get-random-gif: calls GET /v1/gifs/random and returns a SINGLE object", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  const out = await getRandomGif.execute({ tag: "celebrate", rating: "g" }, ctx) as {
    data: { id: string; images: { original: { width: string } } };
  };

  assertEquals(pathOf(calls[0].url), "/v1/gifs/random");
  assertEquals(queryOf(calls[0].url), { tag: "celebrate", rating: "g" });
  // Not an array: this endpoint is the documented exception to the list shape.
  assertEquals(Array.isArray(out.data), false);
  assertEquals(out.data.id, "abc123");
  // width/height pass through as the strings GIPHY sends.
  assertEquals(out.data.images.original.width, "480");
});

Deno.test("get-random-gif: a bare call sends no query at all", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  await getRandomGif.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
