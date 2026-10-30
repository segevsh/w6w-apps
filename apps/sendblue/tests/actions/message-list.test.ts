import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import messageList from "../../actions/message-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("message-list: GETs /api/v2/messages with default limit/offset", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: {} } }]);
  await messageList.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/messages");
  assertEquals(queryOf(calls[0].url), { limit: "50", offset: "0" });
});

test("message-list: forwards is_outbound/sendblue_number for inbound polling", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await messageList.execute({
    isOutbound: "false",
    sendblueNumber: "+16292925296",
    limit: 25,
    offset: 0,
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    is_outbound: "false",
    sendblue_number: "+16292925296",
    limit: "25",
    offset: "0",
  });
});
