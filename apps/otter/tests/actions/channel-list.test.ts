import { assertEquals } from "@std/assert";
import channelList from "../../actions/channel-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("channel-list: fetches GET /channels with no query", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      meta: { retrieved_at: "2026-09-29T00:00:00Z" },
      data: [{ id: "c1", name: "backend product meeting", member_count: 50 }],
    },
  }]);

  const out = await channelList.execute({}, ctx);

  assertEquals(calls[0].url, "https://api.otter.ai/v1/channels");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.data[0].id, "c1");
  assertEquals(out.meta.retrieved_at, "2026-09-29T00:00:00Z");
});

Deno.test("channel-list: declares no params", () => {
  assertEquals(channelList.params, []);
  assertEquals(channelList.type, "read");
});
