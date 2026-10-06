import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-ticket-class-to-ticket-groups.ts";

Deno.test("add-ticket-class-to-ticket-groups: POST /organizations/o1/events/e1/ticket_classes/t1/ticket_groups/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({
    "organizationId": "o1",
    "eventId": "e1",
    "ticketClassId": "t1",
    "ticketGroupIds": ["g1", "g2"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/organizations/o1/events/e1/ticket_classes/t1/ticket_groups/");
  assertEquals(JSON.parse(calls[0].body!), { "ticket_group_ids": ["g1", "g2"] });
  assertEquals(result, undefined);
});
