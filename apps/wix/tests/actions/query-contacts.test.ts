import { assert, assertEquals } from "@std/assert";
import action from "../../actions/query-contacts.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("query-contacts: POSTs /contacts/v4/contacts/query with an empty query by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/contacts/v4/contacts/query");
  assertEquals(JSON.parse(calls[0].body!), { query: {} });
});

Deno.test("query-contacts: nests filter, sort, paging and projections under `query`", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    filter: { "info.name.last": "Smith" },
    sortFieldName: "createdDate",
    sortOrder: "DESC",
    fields: "info.name,info.emails",
    fieldsets: "BASIC",
    limit: 30,
    offset: 30,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    query: {
      filter: { "info.name.last": "Smith" },
      sort: [{ fieldName: "createdDate", order: "DESC" }],
      paging: { limit: 30, offset: 30 },
      fields: ["info.name", "info.emails"],
      fieldsets: ["BASIC"],
    },
  });
});

Deno.test("query-contacts: puts `search` beside `query`, not inside it", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ search: "ada@example.com" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.search, "ada@example.com");
  assert(!("search" in sent.query));
});

Deno.test("query-contacts: is a search action", () => {
  assertEquals(action.type, "search");
});
