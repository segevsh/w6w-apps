import { assertEquals } from "@std/assert";
import channelMembersList from "../../actions/channel-members-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("channel-members-list: fetches GET /channels/{id}/members", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      meta: { retrieved_at: "2026-09-29T00:00:00Z" },
      data: [{ id: "u1", name: "Jane Doe", email: "jane@example.com" }],
    },
  }]);

  const out = await channelMembersList.execute({ channelId: "chan_1" }, ctx);

  assertEquals(calls[0].url, "https://api.otter.ai/v1/channels/chan_1/members");
  assertEquals(out.data[0].name, "Jane Doe");
});

Deno.test("channel-members-list: URL-encodes the channel id", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: {}, data: [] } }]);
  await channelMembersList.execute({ channelId: "chan/weird id" }, ctx);
  assertEquals(calls[0].url, "https://api.otter.ai/v1/channels/chan%2Fweird%20id/members");
});

Deno.test("channel-members-list: channelId is required", () => {
  const param = channelMembersList.params!.find((p) => p.key === "channelId")!;
  assertEquals(param.required, true);
});
