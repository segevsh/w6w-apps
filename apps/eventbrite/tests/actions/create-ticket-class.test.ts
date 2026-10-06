import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-ticket-class.ts";

Deno.test("create-ticket-class: POST /events/e1/ticket_classes/", async () => {
  const resp = { "id": "t1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "eventId": "e1",
    "name": "GA",
    "cost": "USD,4500",
    "capacity": 100,
    "salesChannels": ["online"],
    "includeFee": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/ticket_classes/");
  assertEquals(JSON.parse(calls[0].body!), {
    "ticket_class": {
      "name": "GA",
      "cost": "USD,4500",
      "capacity": 100,
      "sales_channels": ["online"],
      "include_fee": true,
    },
  });
  assertEquals(result, resp);
});

Deno.test("create-ticket-class: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ "eventId": "e1", "extra": { "zzz": { "a": 1 } } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "ticket_class": { "zzz": { "a": 1 } } });
});
