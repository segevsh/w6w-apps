import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/list-chat-messages.ts";

const CHAT = "19:2da4c29f6d7041eca70b638b43d45437@thread.v2";

Deno.test("list-chat-messages: GETs /chats/{id}/messages with the id encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "1616964509832" }] } }]);
  const out = await action.execute({ chatId: CHAT, top: 2 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(
    url.pathname,
    "/v1.0/chats/19%3A2da4c29f6d7041eca70b638b43d45437%40thread.v2/messages",
  );
  assertEquals(url.searchParams.get("$top"), "2");
  assertEquals(out.value.length, 1);
});

Deno.test("list-chat-messages: passes the matched $orderby and $filter pair", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({
    chatId: CHAT,
    orderby: "lastModifiedDateTime desc",
    filter: "lastModifiedDateTime gt 2026-08-01T00:00:00.000Z",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("$orderby"), "lastModifiedDateTime desc");
  assertEquals(q.get("$filter"), "lastModifiedDateTime gt 2026-08-01T00:00:00.000Z");
});

Deno.test("list-chat-messages: offers only the two descending orderings Graph supports", () => {
  const orderby = action.params!.find((p) => p.key === "orderby")!;
  assertEquals(
    optionValues(orderby.options),
    ["lastModifiedDateTime desc", "createdDateTime desc"],
  );
});

Deno.test("list-chat-messages: warns that a mismatched filter is silently ignored", () => {
  const filter = action.params!.find((p) => p.key === "filter")!;
  assert(filter.hint!.includes("silently ignored"));
});

Deno.test("list-chat-messages: caps $top at the documented 50", () => {
  assertEquals(action.params!.find((p) => p.key === "top")!.validation?.max, 50);
});

Deno.test("list-chat-messages: walks pages under `all`", async () => {
  const next = "https://graph.microsoft.com/v1.0/chats/x/messages?p=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }] } },
  ]);
  const out = await action.execute({ chatId: CHAT, all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.pages, 2);
});
