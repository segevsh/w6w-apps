import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import contactsList from "../../actions/contacts-list.ts";

Deno.test("contacts-list: passes the paging and filter query", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "page": 2, "count": 0, "contacts": [] },
  }]);
  await contactsList.execute!(
    { "channelUuid": "WPN1", "resultsPerPage": 10, "pageNumber": 2 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/contacts?channel_uuid=WPN1&results_per_page=10&page_number=2",
  );
  assertEquals(calls[0].body, null);
});

Deno.test("contacts-list: starts at page 0 when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contacts": [] } }]);
  await contactsList.execute!({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/contacts?page_number=0");
  assertEquals(calls[0].body, null);
});
