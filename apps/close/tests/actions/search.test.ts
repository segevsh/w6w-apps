import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/search.ts";

const query = {
  type: "and",
  queries: [{ type: "object_type", object_type: "contact" }],
};

Deno.test("search: POSTs the query tree to /data/search/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], cursor: null } }]);
  await action.execute({ query }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/data/search/");
  assertEquals(JSON.parse(calls[0].body!), { query });
});

Deno.test("search: passes the query tree through verbatim, without reshaping it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], cursor: null } }]);
  const deep = {
    type: "and",
    queries: [
      { type: "object_type", object_type: "contact" },
      {
        type: "field_condition",
        field: { type: "regular_field", object_type: "contact", field_name: "title" },
        condition: { type: "text", mode: "full_words", value: "CEO" },
      },
    ],
  };
  await action.execute({ query: deep }, ctx);
  assertEquals(JSON.parse(calls[0].body!).query, deep);
});

Deno.test("search: maps the documented body params to their underscore names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], cursor: null } }]);
  await action.execute({
    query,
    limit: 10,
    cursor: "abc",
    fields: { contact: ["id", "name"] },
    sort: [{ direction: "asc" }],
    includeCounts: true,
    resultsLimit: 0,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    query,
    _limit: 10,
    cursor: "abc",
    _fields: { contact: ["id", "name"] },
    sort: [{ direction: "asc" }],
    include_counts: true,
    results_limit: 0,
  });
});

Deno.test("search: keeps a resultsLimit of 0, which is the count-only idiom", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], cursor: null } }]);
  await action.execute({ query, includeCounts: true, resultsLimit: 0 }, ctx);
  // 0 must survive compaction — with include_counts it means "how many, without fetching any".
  assertEquals(JSON.parse(calls[0].body!).results_limit, 0);
});

Deno.test("search: returns the cursor envelope, not the has_more one", async () => {
  const body = { data: [{ id: "cont_1", __object_type: "contact" }], cursor: "next" };
  const { ctx } = mockCtx([{ status: 200, body }]);
  const out = await action.execute({ query }, ctx) as Record<string, unknown>;
  assertEquals(out.cursor, "next");
  assertEquals(out.has_more, undefined);
});

Deno.test("search: requires the query and documents the DSL at the form", () => {
  const p = param(action, "query");
  assertEquals(p.required, true);
  assertEquals(p.type, "json");
  assert(/field_condition|object_type/.test(p.hint!));
});
