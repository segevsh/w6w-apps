import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/remove-playlist-item.ts";

Deno.test("remove-playlist-item: DELETEs /youtube/v3/playlistItems?id= with no part", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "I1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/youtube/v3/playlistItems");
  assertEquals(url.searchParams.get("id"), "I1");
  assertEquals(url.searchParams.get("part"), null);
  assertEquals(out, { deleted: true });
});

Deno.test("remove-playlist-item: labels its id as the membership, not the video", () => {
  const id = action.params!.find((p) => p.key === "id");
  assertEquals(id?.label, "Playlist item ID");
  assert(/NOT the video ID/i.test(id!.hint!));
  assert(!action.params!.some((p) => p.key === "videoId"));
  assertEquals(action.idempotent, true);
});
