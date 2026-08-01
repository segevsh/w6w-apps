import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/playlist-add-tracks.ts";

Deno.test("playlist-add-tracks: POSTs /playlists/{id}/tracks with URIs built from bare IDs", async () => {
  const { ctx, calls } = mockCtx([{ body: { snapshot_id: "s1" } }]);
  await action.execute(
    { playlistId: "3cEYpjA9oz9GiPac4AsH4n", trackIds: "abc, spotify:track:def" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/playlists/3cEYpjA9oz9GiPac4AsH4n/tracks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.uris, ["spotify:track:abc", "spotify:track:def"]);
});

Deno.test("playlist-add-tracks: strips a playlist URI down to the bare ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ playlistId: "spotify:playlist:xyz", trackIds: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/playlists/xyz/tracks");
});

Deno.test("playlist-add-tracks: omits position when unset, includes it when given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await action.execute({ playlistId: "p1", trackIds: "t1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).position, undefined);

  await action.execute({ playlistId: "p1", trackIds: "t1", position: 3 }, ctx);
  assertEquals(JSON.parse(calls[1].body!).position, 3);
});

Deno.test("playlist-add-tracks: is not idempotent — a retry appends duplicate tracks", () => {
  assertEquals(action.idempotent, false);
});
