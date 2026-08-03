import { assertEquals } from "@std/assert";
import action from "../../actions/query-sites.ts";
import { mockCtx } from "../_helpers.ts";
import { SCOPE_HEADER } from "../../lib/client.ts";

Deno.test("query-sites: POSTs /site-list/v2/sites/query", async () => {
  const { ctx, calls } = mockCtx([{ body: { sites: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/site-list/v2/sites/query");
  assertEquals(JSON.parse(calls[0].body!), { query: {} });
});

Deno.test("query-sites: is the one ACCOUNT-scoped action — it must not ask for wix-site-id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].headers[SCOPE_HEADER], "account");
});

Deno.test("query-sites: forwards filter, sort and cursor paging", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    filter: { editorType: "EDITOR" },
    sortFieldName: "createdDate",
    sortOrder: "ASC",
    limit: 2,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    query: {
      filter: { editorType: "EDITOR" },
      sort: [{ fieldName: "createdDate", order: "ASC" }],
      cursorPaging: { limit: 2 },
    },
  });
});

Deno.test("query-sites: is a search action", () => {
  assertEquals(action.type, "search");
});
