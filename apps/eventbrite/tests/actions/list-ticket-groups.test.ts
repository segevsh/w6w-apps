import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-ticket-groups.ts";

Deno.test("list-ticket-groups: GET /organizations/o1/ticket_groups/", async () => {
  const resp = { "ticket_groups": [], "pagination": {} };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "organizationId": "o1",
    "status": "live",
    "continuation": "abc",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v3/organizations/o1/ticket_groups/");
  assertEquals(url.searchParams.get("status"), "live");
  assertEquals(url.searchParams.get("continuation"), "abc");
  assertEquals(calls[0].body, null);
  assertEquals(result, resp);
});
