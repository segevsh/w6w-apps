import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-ticket-group.ts";

Deno.test("create-ticket-group: POST /organizations/o1/ticket_groups/", async () => {
  const resp = { "id": "g1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "organizationId": "o1",
    "name": "VIPs",
    "eventTicketIds": { "1": ["12345"] },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/organizations/o1/ticket_groups/");
  assertEquals(JSON.parse(calls[0].body!), {
    "ticket_group": { "name": "VIPs", "event_ticket_ids": { "1": ["12345"] } },
  });
  assertEquals(result, resp);
});

Deno.test("create-ticket-group: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ "organizationId": "o1", "extra": { "zzz": { "a": 1 } } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "ticket_group": { "zzz": { "a": 1 } } });
});
