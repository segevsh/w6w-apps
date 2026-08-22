import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/profile-query.ts";

const conn = { display: { projectId: "123", region: "us" } };

Deno.test("profile-query: a filter expression goes out as `where`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], total: 0 } }], conn);
  await action.execute!({ where: 'properties["plan"] == "pro"' }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/query/engage");
  assertEquals(url.searchParams.get("where"), 'properties["plan"] == "pro"');
});

Deno.test("profile-query: a cohort id becomes Mixpanel's filter_by_cohort JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], conn);
  await action.execute!({ cohortId: "555" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter_by_cohort"), '{"id":555}');
});

Deno.test("profile-query: a filter AND a cohort is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ where: "x", cohortId: "1" }, ctx),
    Error,
    "one selector",
  );
  assertEquals(calls.length, 0);
});

/** The session id is what pins the result set between pages. */
Deno.test("profile-query: paging reuses Mixpanel's session id", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { results: [{ $distinct_id: "a" }], total: 2, session_id: "sess-1", page: 0 },
    },
    { status: 200, body: { results: [{ $distinct_id: "b" }] } },
  ], conn);
  const out = await action.execute!({ where: "x", returnAll: true }, ctx) as {
    results: unknown[];
    pages: number;
  };
  assertEquals(out.results.length, 2);
  assertEquals(out.pages, 2);
  const second = new URL(calls[1].url).searchParams;
  assertEquals(second.get("session_id"), "sess-1");
  assertEquals(second.get("page"), "1");
});

/** Each page is a request, and there are only sixty an hour. */
Deno.test("profile-query: paging stops at the page ceiling", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: [{ a: 1 }], total: 99, session_id: "s", page: 0 } },
    { status: 200, body: { results: [{ a: 2 }] } },
  ], conn);
  await action.execute!({ where: "x", returnAll: true, maxPages: 2 }, ctx);
  assertEquals(calls.length, 2);
});
