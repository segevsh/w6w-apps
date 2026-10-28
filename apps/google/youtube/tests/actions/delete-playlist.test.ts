import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-playlist.ts";

Deno.test("delete-playlist: DELETEs /youtube/v3/playlists?id= with no part", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "PL1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/youtube/v3/playlists");
  assertEquals(url.searchParams.get("id"), "PL1");
  assertEquals(url.searchParams.get("part"), null);
  assertEquals(out, { deleted: true });
});

Deno.test("delete-playlist: declares no part and is retry-safe", () => {
  assert(!action.params!.some((p) => p.key === "part"));
  assertEquals(action.idempotent, true);
});
