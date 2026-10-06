import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import messagesList from "../../actions/messages-list.ts";

Deno.test("messages-list: lists all messages on the number", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "page_number": 0, "messages": [] } }]);
  await messagesList.execute!({ "yourNumber": "+595981048477" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/messages/+595981048477?page_number=0",
  );
  assertEquals(calls[0].body, null);
});

Deno.test("messages-list: narrows to one conversation and page", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "messages": [] } }]);
  await messagesList.execute!(
    { "yourNumber": "+595981048477", "remoteNumber": "+595981111111", "pageNumber": 1 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/whatsapp/messages/+595981048477/+595981111111?page_number=1",
  );
  assertEquals(calls[0].body, null);
});
