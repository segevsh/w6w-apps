import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-search.ts";

Deno.test("contact-search: POSTs /contacts/search with a single filter and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pages: {} } }]);
  await action.execute!({ field: "email", operator: "=", value: "a@b.com", perPage: 25 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/contacts/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    query: { field: "email", operator: "=", value: "a@b.com" },
    pagination: { per_page: 25 },
  });
});

Deno.test("contact-search: a full query object overrides field/operator/value", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const query = { operator: "AND", value: [{ field: "role", operator: "=", value: "user" }] };
  await action.execute!({ query, startingAfter: "cur1" }, ctx);

  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query, query);
  assertEquals(sent.pagination, { per_page: 50, starting_after: "cur1" });
});
