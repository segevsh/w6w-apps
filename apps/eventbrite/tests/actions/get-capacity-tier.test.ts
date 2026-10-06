import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-capacity-tier.ts";

Deno.test("get-capacity-tier: GET /events/e1/capacity_tier/", async () => {
  const resp = { "capacity_total": 100 };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ "eventId": "e1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e1/capacity_tier/");
  assertEquals(calls[0].body, null);
  assertEquals(result, resp);
});
