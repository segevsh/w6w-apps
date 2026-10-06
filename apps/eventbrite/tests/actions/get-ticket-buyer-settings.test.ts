import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-ticket-buyer-settings.ts";

Deno.test("get-ticket-buyer-settings: GET /events/e1/ticket_buyer_settings/", async () => {
  const resp = { "event_id": "e1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ "eventId": "e1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/events/e1/ticket_buyer_settings/");
  assertEquals(calls[0].body, null);
  assertEquals(result, resp);
});
