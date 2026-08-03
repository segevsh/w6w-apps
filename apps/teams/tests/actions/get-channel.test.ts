import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-channel.ts";

const CHANNEL = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";

Deno.test("get-channel: percent-encodes the channel id in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: CHANNEL, displayName: "General" } }]);
  const out = await action.execute({ teamId: "t1", channelId: CHANNEL }, ctx);

  const path = new URL(calls[0].url).pathname;
  assertEquals(
    path,
    "/v1.0/teams/t1/channels/19%3A4a95f7d8db4c4e7fae857bcebe0623e6%40thread.tacv2",
  );
  assertEquals(out.displayName, "General");
});

Deno.test("get-channel: passes $select so `summary` can be requested explicitly", async () => {
  const { ctx, calls } = mockCtx([{ body: { summary: { membersCount: 3 } } }]);
  await action.execute({ teamId: "t1", channelId: CHANNEL, select: ["summary"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$select"), "summary");
});

Deno.test("get-channel: the select hint tells the user summary is opt-in", () => {
  const select = action.params!.find((p) => p.key === "select")!;
  assert(select.hint!.includes("summary"));
});

Deno.test("get-channel: omits $select when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ teamId: "t1", channelId: CHANNEL }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("$select"), false);
});
