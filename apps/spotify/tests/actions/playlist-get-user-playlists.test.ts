import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/playlist-get-user-playlists.ts";

Deno.test("playlist-get-user-playlists: GETs /me/playlists with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/me/playlists");
  assertEquals(url.searchParams.get("limit"), "20");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("playlist-get-user-playlists: forwards custom limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ limit: 50, offset: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "50");
  assertEquals(url.searchParams.get("offset"), "10");
});
