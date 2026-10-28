import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-channel-members.ts";

const CHANNEL = "19:20bc1df46b1148e9b22539b83bc66809@thread.skype";

Deno.test("list-channel-members: GETs the channel's members with the OData params", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ userId: "u1" }] } }]);
  const out = await action.execute({
    teamId: "t1",
    channelId: CHANNEL,
    filter: "microsoft.graph.aadUserConversationMember/userId eq 'u1'",
    select: ["id"],
    top: 50,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(
    url.pathname,
    "/v1.0/teams/t1/channels/19%3A20bc1df46b1148e9b22539b83bc66809%40thread.skype/members",
  );
  assertEquals(url.searchParams.get("$top"), "50");
  assertEquals(url.searchParams.get("$select"), "id");
  assertEquals(out.value.length, 1);
});

Deno.test("list-channel-members: allows the documented 999 page size", () => {
  assertEquals(action.params!.find((p) => p.key === "top")!.validation?.max, 999);
});

Deno.test("list-channel-members: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/teams/t1/channels/x/members?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ teamId: "t1", channelId: CHANNEL, nextLink: link, top: 10 }, ctx);
  assertEquals(calls[0].url, link);
});
