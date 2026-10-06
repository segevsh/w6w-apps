import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-job-postings.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("search-job-postings: filters are merged into the POST body top level", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: 200, data: [{ id: "j" }], total: 1, dataset_version: "34.0" },
  }]);
  const out = await action.execute!(
    { filters: '{"title":"data engineer","is_active":true}', size: 3 } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v5/job_posting/search");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { title: "data engineer", is_active: true, size: 3 });
  assertEquals(out.found, true);
});

Deno.test("search-job-postings: a raw query works; filters+query, neither, and bad size are refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: 200, data: [], total: 0 } }]);
  await action.execute!({ query: { term: { title_role: "engineering" } } } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!), { query: { term: { title_role: "engineering" } } });
  const none = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({} as never, none.ctx),
    Error,
    "Give field filters",
  );
  await assertRejects(
    async () => await action.execute!({ filters: { title: "x" }, query: {} } as never, none.ctx),
    Error,
    "not both",
  );
  await assertRejects(
    async () => await action.execute!({ filters: "[1]" } as never, none.ctx),
    Error,
    "JSON object",
  );
  await assertRejects(
    async () => await action.execute!({ filters: {}, size: 0 } as never, none.ctx),
    Error,
    "between 1 and 100",
  );
});

Deno.test("search-job-postings: 404 is an empty page", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: "not_found" } } }]);
  const out = await action.execute!({ filters: { title: "zz" } } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.found, false);
  assertEquals(out.data, []);
});
