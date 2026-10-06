import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import contactsSearch from "../../actions/contacts-search.ts";

Deno.test("contacts-search: sends the term as both documented spellings", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "page": 0, "count": 0, "contacts": [] },
  }]);
  await contactsSearch.execute!({ "query": "augusto" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/contacts/search?query=augusto&q=augusto&page_number=0",
  );
  assertEquals(calls[0].body, null);
});

Deno.test("contacts-search: passes channel and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contacts": [] } }]);
  await contactsSearch.execute!(
    { "query": "k", "channelUuid": "WPN1", "resultsPerPage": 5, "pageNumber": 1 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.p.2chat.io/open/contacts/search?query=k&q=k&channel_uuid=WPN1&results_per_page=5&page_number=1",
  );
  assertEquals(calls[0].body, null);
});
