import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-channel-message.ts";

const CHANNEL = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";

Deno.test("get-channel-message: GETs the root message when no reply id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1614618259349", replyToId: null } }]);
  const out = await action.execute({
    teamId: "t1",
    channelId: CHANNEL,
    messageId: "1614618259349",
  }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/teams/t1/channels/19%3A4a95f7d8db4c4e7fae857bcebe0623e6%40thread.tacv2/messages/1614618259349",
  );
  assertEquals(out.id, "1614618259349");
});

Deno.test("get-channel-message: switches to the nested replies path when a reply id is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1613671348387", replyToId: "1612509044972" } }]);
  await action.execute({
    teamId: "t1",
    channelId: CHANNEL,
    messageId: "1612509044972",
    replyId: "1613671348387",
  }, ctx);

  assertEquals(
    new URL(calls[0].url).pathname.endsWith("/messages/1612509044972/replies/1613671348387"),
    true,
  );
});

Deno.test("get-channel-message: sends no query parameters — the endpoint supports no OData", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ teamId: "t1", channelId: CHANNEL, messageId: "1" }, ctx);
  assertEquals([...new URL(calls[0].url).searchParams.keys()], []);
  assertEquals(action.params!.map((p) => p.key).includes("select"), false);
});
