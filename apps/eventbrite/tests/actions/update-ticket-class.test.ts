import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-ticket-class.ts";

Deno.test("update-ticket-class: POST /events/e1/ticket_classes/t1/", async () => {
  const resp = { "id": "t1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "eventId": "e1",
    "ticketClassId": "t1",
    "name": "VIP",
    "capacity": 50,
    "hidden": true,
    "imageId": "99",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/events/e1/ticket_classes/t1/");
  assertEquals(JSON.parse(calls[0].body!), {
    "ticket_class": { "name": "VIP", "capacity": 50, "hidden": true, "image_id": "99" },
  });
  assertEquals(result, resp);
});

Deno.test("update-ticket-class: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { "eventId": "e1", "ticketClassId": "t1", "extra": { "zzz": { "a": 1 } } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { "ticket_class": { "zzz": { "a": 1 } } });
});
