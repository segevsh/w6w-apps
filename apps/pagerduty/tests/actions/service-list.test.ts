import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-list.ts";

Deno.test("service-list: fetches the first page by default", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { services: [{ id: "SV1" }], more: false } },
  ]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/services?limit=100&offset=0");
  assertEquals(result, [{ id: "SV1" }]);
});

Deno.test("service-list: name filter and team IDs are passed through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { services: [], more: false } }]);
  await action.execute!({ query: "payments", teamIds: "T1,T2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("query"), "payments");
  assertEquals(url.searchParams.getAll("team_ids[]"), ["T1", "T2"]);
});
