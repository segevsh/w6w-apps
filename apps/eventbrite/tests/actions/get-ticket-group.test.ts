import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-ticket-group.ts";

Deno.test("get-ticket-group: GET /ticket_groups/g1/", async () => {
  const resp = { "id": "g1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({ "ticketGroupId": "g1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/ticket_groups/g1/");
  assertEquals(calls[0].body, null);
  assertEquals(result, resp);
});
