import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import contactsSearch from "../../actions/contacts-search.ts";

test("contacts-search: sends the term as both documented spellings", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "page": 0, "count": 0, "contacts": [] },
  }]);
  await contactsSearch.execute!({ "query": "augusto" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/contacts/search?query=augusto&q=augusto&page_number=0",
  );
  assert.deepStrictEqual(calls[0].body, null);
});

test("contacts-search: passes channel and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contacts": [] } }]);
  await contactsSearch.execute!(
    { "query": "k", "channelUuid": "WPN1", "resultsPerPage": 5, "pageNumber": 1 } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/contacts/search?query=k&q=k&channel_uuid=WPN1&results_per_page=5&page_number=1",
  );
  assert.deepStrictEqual(calls[0].body, null);
});
