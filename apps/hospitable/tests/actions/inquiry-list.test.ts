import { assertEquals } from "@std/assert";
import inquiryList from "../../actions/inquiry-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const requiredOf = (a: { params?: Array<{ key: string; required?: boolean }> }) =>
  (a.params ?? []).filter((p) => p.required).map((p) => p.key).sort();

Deno.test("inquiry-list: properties[] required, last_message_at and include forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await inquiryList.execute({
    property_ids: "p1,p2",
    last_message_at: "2026-10-01 00:00:00",
    include: "guest",
    per_page: 20,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/inquiries");
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("properties[]"), ["p1", "p2"]);
  assertEquals(q.get("last_message_at"), "2026-10-01 00:00:00");
  assertEquals(q.get("include"), "guest");
  assertEquals(q.get("per_page"), "20");
  assertEquals(requiredOf(inquiryList), ["property_ids"]);
});
