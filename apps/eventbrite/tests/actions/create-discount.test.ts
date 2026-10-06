import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-discount.ts";

Deno.test("create-discount: wraps body in discount", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1" } }]);
  const result = await action.execute!({
    organizationId: "o1",
    type: "coded",
    code: "SAVE10",
    percentOff: "10",
    eventId: "e1",
    ticketClassIds: ["tc1"],
    quantityAvailable: 5,
    extra: { start_date_relative: 3600 },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/organizations/o1/discounts/");
  assertEquals(JSON.parse(calls[0].body!), {
    discount: {
      type: "coded",
      code: "SAVE10",
      percent_off: "10",
      event_id: "e1",
      ticket_class_ids: ["tc1"],
      quantity_available: 5,
      start_date_relative: 3600,
    },
  });
  assertEquals(result, { id: "d1" });
});
