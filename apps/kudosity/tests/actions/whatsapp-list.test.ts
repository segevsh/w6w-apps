import { assertEquals } from "@std/assert";
import whatsappList from "../../actions/whatsapp-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("whatsapp-list: query names, campaign filter, messages and pagination", async () => {
  const pagination = { type: "cursor", next_cursor: "abc", has_next: true, has_prev: false };
  const { ctx, calls } = mockCtx([{ body: envelope({ messages: [{ id: "1" }] }, { pagination }) }]);
  const out = await whatsappList.execute({
    dateRange: "custom_date",
    startDate: "2025-12-01T00:00:00Z",
    endDate: "2025-12-31T00:00:00Z",
    limit: 50,
    cursor: "c0",
    direction: "prev",
    campaignId: "camp",
  }, ctx) as { messages: unknown[]; pagination: unknown };
  assertEquals(pathOf(calls[0].url), "/v2/whatsapp/messages");
  const q = queryOf(calls[0].url);
  assertEquals(q.get("date_range"), "custom_date");
  assertEquals(q.get("start_date"), "2025-12-01T00:00:00Z");
  assertEquals(q.get("cursor"), "c0");
  assertEquals(q.get("direction"), "prev");
  assertEquals(q.get("campaign_id"), "camp");
  assertEquals(q.get("limit"), "50");
  assertEquals(out.messages.length, 1);
  assertEquals(out.pagination, pagination);
});

Deno.test("whatsapp-list: empty result still returns arrays", async () => {
  const { ctx } = mockCtx([{ body: envelope({}) }]);
  assertEquals(await whatsappList.execute({}, ctx), { messages: [], pagination: null });
});
