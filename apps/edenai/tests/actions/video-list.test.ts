import { assertEquals } from "@std/assert";
import videoList from "../../actions/video-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("video-list: sends the cursor and returns the page cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "list",
      data: [{
        id: "v1",
        status: "completed",
        progress: 100,
        model: "openai/sora-2",
        provider: "openai",
        cost: 1.2,
        created_at: 10,
        completed_at: 20,
      }],
      first_id: "v1",
      last_id: "v1",
      has_more: true,
    },
  }]);
  const out = await videoList.execute({ limit: 5, after: "v9" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/videos");
  assertEquals(queryOf(calls[0].url), { limit: "5", after: "v9" });
  assertEquals((out.videos as unknown[]).length, 1);
  assertEquals(out.hasMore, true);
  assertEquals(out.lastId, "v1");
});

Deno.test("video-list: asks for 20 by default and an empty list ends paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], has_more: false } }]);
  const out = await videoList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(queryOf(calls[0].url), { limit: "20" });
  assertEquals(out.hasMore, false);
  assertEquals(out.lastId, undefined);
});
