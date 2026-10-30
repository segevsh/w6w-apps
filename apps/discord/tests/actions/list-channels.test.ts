import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-channels.ts";

test("list-channels: GETs /guilds/{id}/channels and wraps the result", async () => {
  const body = [
    { id: "c1", type: 0, name: "general" },
    { id: "c2", type: 2, name: "voice" },
  ];
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ guildId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v10/guilds/g1/channels");
  assertEquals(result, { channels: body });
});

test("list-channels: filterTypes narrows the returned list to those types", async () => {
  const body = [
    { id: "c1", type: 0, name: "general" },
    { id: "c2", type: 2, name: "voice" },
    { id: "c3", type: 4, name: "category" },
  ];
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ guildId: "g1", filterTypes: [0] }, ctx) as {
    channels: Array<{ id: string }>;
  };
  assertEquals(result.channels.length, 1);
  assertEquals(result.channels[0].id, "c1");
});

test("list-channels: limit slices from the top", async () => {
  const body = [{ id: "c1", type: 0 }, { id: "c2", type: 0 }, { id: "c3", type: 0 }];
  const { ctx } = mockCtx([{ body }]);
  const result = await action.execute!({ guildId: "g1", limit: 2 }, ctx) as {
    channels: unknown[];
  };
  assertEquals(result.channels.length, 2);
});
