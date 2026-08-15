import { assertEquals } from "@std/assert";
import messageStoreList from "../../actions/message-store-list.ts";
import { listEnvelope, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("message-store-list: hits the extension mailbox", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  const out = await messageStoreList.execute({}, ctx) as { records: unknown[] };

  assertEquals(pathOf(calls[0].url), "/restapi/v1.0/account/~/extension/~/message-store");
  assertEquals(out.records.length, 1);
});

Deno.test("message-store-list: multi-valued filters repeat the query key", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await messageStoreList.execute(
    {
      availability: ["Alive"],
      direction: ["Inbound", "Outbound"],
      messageType: ["SMS"],
      readStatus: ["Unread"],
    },
    ctx,
  );
  assertEquals(queryAllOf(calls[0].url, "direction"), ["Inbound", "Outbound"]);
  assertEquals(queryAllOf(calls[0].url, "availability"), ["Alive"]);
  assertEquals(queryAllOf(calls[0].url, "messageType"), ["SMS"]);
  assertEquals(queryAllOf(calls[0].url, "readStatus"), ["Unread"]);
});

Deno.test("message-store-list: distinctConversations is only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }, { body: listEnvelope([]) }]);
  await messageStoreList.execute({ distinctConversations: false }, ctx);
  assertEquals(queryOf(calls[0].url).distinctConversations, undefined);

  await messageStoreList.execute({ distinctConversations: true }, ctx);
  assertEquals(queryOf(calls[1].url).distinctConversations, "true");
});
