import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-capacity-tier.ts";

Deno.test("update-capacity-tier: POST /events/e1/capacity_tier/", async () => {
  const resp = { "capacity_total": 100 };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "eventId": "e1",
    "capacityTotal": 100,
    "holds": [{ "name": "Marketing", "quantity_total": 10, "sort_order": 1 }],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/capacity_tier/");
  assertEquals(JSON.parse(calls[0].body!), {
    "capacity_total": 100,
    "holds": [{ "name": "Marketing", "quantity_total": 10, "sort_order": 1 }],
  });
  assertEquals(result, resp);
});

Deno.test("update-capacity-tier: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ "eventId": "e1", "extra": { "zzz": { "a": 1 } } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "zzz": { "a": 1 } });
});
