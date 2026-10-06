import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-ticket-class.ts";

Deno.test("get-ticket-class: GET /events/e1/ticket_classes/t%2F2/", async () => {
  const resp = { "id": "t/2" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ "eventId": "e1", "ticketClassId": "t/2" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e1/ticket_classes/t%2F2/");
  assertEquals(calls[0].body, null);
  assertEquals(result, resp);
});
