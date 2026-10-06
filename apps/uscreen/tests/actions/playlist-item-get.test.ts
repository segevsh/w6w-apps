import { assertEquals, assertRejects } from "@std/assert";
import playlistItemGet from "../../actions/playlist-item-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("playlist-item-get: sends GET /contents/${seg(input.contentId)}/playlist_items/${seg(input.playlistItemId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 5 } }]);
  const out = await playlistItemGet.execute(
    { "contentId": "1", "playlistItemId": "5" } as never,
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/contents/1/playlist_items/5");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 5 });
});

Deno.test("playlist-item-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      playlistItemGet.execute({ "contentId": "1", "playlistItemId": "5" } as never, ctx) as Promise<
        unknown
      >,
    Error,
    "bad input",
  );
});
