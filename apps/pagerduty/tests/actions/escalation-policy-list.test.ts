import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/escalation-policy-list.ts";

Deno.test("escalation-policy-list: fetches the first page by default", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { escalation_policies: [{ id: "EP1" }], more: false } },
  ]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/escalation_policies?limit=100&offset=0");
  assertEquals(result, [{ id: "EP1" }]);
});

Deno.test("escalation-policy-list: name/user/team filters are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { escalation_policies: [], more: false } }]);
  await action.execute!({ query: "primary", userIds: "U1,U2", teamIds: "T1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "primary");
  assertEquals(url.searchParams.getAll("user_ids[]"), ["U1", "U2"]);
  assertEquals(url.searchParams.getAll("team_ids[]"), ["T1"]);
});
