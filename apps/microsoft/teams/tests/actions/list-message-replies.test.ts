import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-message-replies.ts";

const CHANNEL = "19:4a95f7d8db4c4e7fae857bcebe0623e6@thread.tacv2";

Deno.test("list-message-replies: GETs the replies collection with $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "1616989753153" }] } }]);
  const out = await action.execute({
    teamId: "t1",
    channelId: CHANNEL,
    messageId: "1616989510408",
    top: 50,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname.endsWith("/messages/1616989510408/replies"), true);
  assertEquals(url.searchParams.get("$top"), "50");
  assertEquals(out.value.length, 1);
});

Deno.test("list-message-replies: caps $top at 50 and offers no other OData", () => {
  assertEquals(action.params!.find((p) => p.key === "top")!.validation?.max, 50);
  assertEquals(
    action.params!.map((p) => p.key),
    ["teamId", "channelId", "messageId", "top", "nextLink", "all", "maxPages"],
  );
});

Deno.test("list-message-replies: walks the whole thread when `all` is set", async () => {
  const next = "https://graph.microsoft.com/v1.0/teams/t/channels/c/messages/m/replies?p=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({
    teamId: "t1",
    channelId: CHANNEL,
    messageId: "m1",
    all: true,
  }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.length, 2);
});
