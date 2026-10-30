import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import contactsList from "../../actions/contacts-list.ts";

test("contacts-list: passes the paging and filter query", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "page": 2, "count": 0, "contacts": [] },
  }]);
  await contactsList.execute!(
    { "channelUuid": "WPN1", "resultsPerPage": 10, "pageNumber": 2 } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(
    calls[0].url,
    "https://api.p.2chat.io/open/contacts?channel_uuid=WPN1&results_per_page=10&page_number=2",
  );
  assert.deepStrictEqual(calls[0].body, null);
});

test("contacts-list: starts at page 0 when none is given", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contacts": [] } }]);
  await contactsList.execute!({} as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/contacts?page_number=0");
  assert.deepStrictEqual(calls[0].body, null);
});
