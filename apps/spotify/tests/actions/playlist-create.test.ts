import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/playlist-create.ts";

Deno.test("playlist-create: POSTs /me/playlists with defaults applied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "p1" } }]);
  await action.execute({ name: "Favorites" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/me/playlists");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { name: "Favorites", public: true, collaborative: false });
});

Deno.test("playlist-create: sends description and visibility flags when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { name: "Secret Mix", description: "just for me", public: false, collaborative: true },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    name: "Secret Mix",
    description: "just for me",
    public: false,
    collaborative: true,
  });
});

Deno.test("playlist-create: is not idempotent — a retry creates a second playlist", () => {
  assertEquals(action.idempotent, false);
});
