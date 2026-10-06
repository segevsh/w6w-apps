import { assertEquals } from "@std/assert";
import smsList from "../../actions/sms-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sms-list: maps filters to the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { smses: [{ id: "1" }], total_records: "1" } }]);
  const out = await smsList.execute({
    limit: 10,
    page: 2,
    startDate: "2024-01-01T00:00:00Z",
    recipient: "61",
    messageRef: "r",
    status: "DELIVERED",
    direction: "IN",
    newestFirst: false,
  }, ctx) as { smses: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/sms");
  const q = queryOf(calls[0].url);
  assertEquals(q.get("limit"), "10");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("start_date"), "2024-01-01T00:00:00Z");
  assertEquals(q.get("message_ref"), "r");
  assertEquals(q.get("status"), "DELIVERED");
  assertEquals(q.get("direction"), "IN");
  assertEquals(q.getAll("order_by"), ["CREATED_AT_ASC"]);
  assertEquals(q.get("format"), "JSON");
  assertEquals(out.smses.length, 1);
});

Deno.test("sms-list: no filters sends only format=JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { smses: [] } }]);
  await smsList.execute({}, ctx);
  assertEquals([...queryOf(calls[0].url).keys()], ["format"]);
});
