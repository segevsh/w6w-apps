import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/oncall-list.ts";

Deno.test("oncall-list: fetches the first page by default", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { oncalls: [{ user: { id: "U1" } }], more: false } },
  ]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/oncalls?limit=100&offset=0");
  assertEquals(result, [{ user: { id: "U1" } }]);
});

Deno.test("oncall-list: filters map to bracketed array query params, earliest to a bare flag", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { oncalls: [], more: false } }]);
  await action.execute!(
    { scheduleIds: "SCH1,SCH2", escalationPolicyIds: "EP1", userIds: "U1", earliest: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("schedule_ids[]"), ["SCH1", "SCH2"]);
  assertEquals(url.searchParams.getAll("escalation_policy_ids[]"), ["EP1"]);
  assertEquals(url.searchParams.getAll("user_ids[]"), ["U1"]);
  assertEquals(url.searchParams.get("earliest"), "true");
});
