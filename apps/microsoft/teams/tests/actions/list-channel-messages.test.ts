import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-channel-messages.ts";

const CHANNEL = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";

Deno.test("list-channel-messages: GETs the channel's messages with $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "1616965872395" }] } }]);
  const out = await action.execute({ teamId: "t1", channelId: CHANNEL, top: 3 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(
    url.pathname,
    "/v1.0/teams/t1/channels/19%3A4a95f7d8db4c4e7fae857bcebe0623e6%40thread.tacv2/messages",
  );
  assertEquals(url.searchParams.get("$top"), "3");
  assertEquals(out.value.length, 1);
});

Deno.test("list-channel-messages: caps $top at the documented 50", () => {
  const top = action.params!.find((p) => p.key === "top")!;
  assertEquals(top.default, 20);
  assertEquals(top.validation?.max, 50);
});

Deno.test("list-channel-messages: sends $expand=replies only when asked", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }, { body: { value: [] } }]);
  await action.execute({ teamId: "t1", channelId: CHANNEL, expandReplies: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$expand"), "replies");

  await action.execute({ teamId: "t1", channelId: CHANNEL, expandReplies: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("$expand"), false);
});

Deno.test("list-channel-messages: offers no $filter or $orderby — Graph supports neither", () => {
  const keys = action.params!.map((p) => p.key);
  assertEquals(keys.includes("filter"), false);
  assertEquals(keys.includes("orderby"), false);
});

Deno.test("list-channel-messages: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/teams/t1/channels/x/messages?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ teamId: "t1", channelId: CHANNEL, nextLink: link, top: 50 }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-channel-messages: walks pages under `all`, bounded by maxPages", async () => {
  const next = "https://graph.microsoft.com/v1.0/teams/t1/channels/x/messages?p=2";
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "a" }], "@odata.nextLink": next } }]);
  const out = await action.execute({
    teamId: "t1",
    channelId: CHANNEL,
    all: true,
    maxPages: 1,
  }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.nextLink, next);
});
