import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-chats.ts";

Deno.test("list-chats: GETs /me/chats", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "19:abc@thread.v2" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/chats");
  assertEquals(out.value.length, 1);
});

Deno.test("list-chats: maps $expand, $orderby, $filter and $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    expand: ["members", "lastMessagePreview"],
    orderby: "lastMessagePreview/createdDateTime desc",
    filter: "chatType eq 'oneOnOne'",
    top: 50,
  }, ctx);

  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$expand"), "members,lastMessagePreview");
  assertEquals(q.get("$orderby"), "lastMessagePreview/createdDateTime desc");
  assertEquals(q.get("$filter"), "chatType eq 'oneOnOne'");
  assertEquals(q.get("$top"), "50");
});

Deno.test("list-chats: only offers the two documented $expand targets", () => {
  const expand = action.params!.find((p) => p.key === "expand")!;
  assertEquals(expand.type, "multiselect");
  assertEquals(optionValues(expand.options), ["members", "lastMessagePreview"]);
});

Deno.test("list-chats: only offers the one supported ordering — descending", () => {
  const orderby = action.params!.find((p) => p.key === "orderby")!;
  assertEquals(orderby.type, "select");
  assertEquals(optionValues(orderby.options), ["lastMessagePreview/createdDateTime desc"]);
});

Deno.test("list-chats: caps $top at the documented 50", () => {
  assertEquals(action.params!.find((p) => p.key === "top")!.validation?.max, 50);
});

Deno.test("list-chats: replays a nextLink verbatim", async () => {
  const link = "https://graph.microsoft.com/v1.0/chats?$skiptoken=abc";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink: link, top: 50 }, ctx);
  assertEquals(calls[0].url, link);
});
