import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-ticket-group.ts";

Deno.test("update-ticket-group: POST /ticket_groups/g1/", async () => {
  const resp = { "id": "g1" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({
    "ticketGroupId": "g1",
    "name": "Renamed",
    "status": "archived",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v3/ticket_groups/g1/");
  assertEquals(JSON.parse(calls[0].body!), {
    "ticket_group": { "name": "Renamed", "status": "archived" },
  });
  assertEquals(result, resp);
});

Deno.test("update-ticket-group: sends only supplied fields and deep-merges extra", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ "ticketGroupId": "g1", "extra": { "zzz": { "a": 1 } } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { "ticket_group": { "zzz": { "a": 1 } } });
});
