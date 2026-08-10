import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx, optionValues } from "../_helpers.ts";
import postList from "../../actions/post-list.ts";

const empty = () => data({ posts: { edges: [], pageInfo: {} } });

Deno.test("post-list: first and after are field arguments, NOT part of input", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1", first: 20, after: "cur" }, ctx);
  const { query, variables } = gqlOf(calls[0]);
  assertEquals(variables, { input: { organizationId: "o1" }, first: 20, after: "cur" });
  assert(
    /\$input: PostsInput!, \$first: Int, \$after: String/.test(query),
    query,
  );
  assert(/posts\(input: \$input, first: \$first, after: \$after\)/.test(query), query);
});

Deno.test("post-list: no filter is sent when nothing is filtered", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { organizationId: "o1" } });
});

Deno.test("post-list: statuses go out as an array, in Buffer's spelling", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1", status: ["scheduled", "needs_approval"] }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { filter: { status: string[] } } }).input.filter.status,
    ["scheduled", "needs_approval"],
  );
});

Deno.test("post-list: a single status string is tolerated as well as an array", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1", status: "sent" }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { filter: { status: string[] } } }).input.filter.status,
    ["sent"],
  );
});

Deno.test("post-list: the status options are Buffer's six, underscore included", () => {
  assertEquals(optionValues(postList, "status"), [
    "draft",
    "needs_approval",
    "scheduled",
    "sending",
    "sent",
    "error",
  ]);
});

Deno.test("post-list: dueAt start/end become a DateTimeComparator, not top-level dates", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({
    organizationId: "o1",
    dueAtStart: "2026-01-01T00:00:00Z",
    dueAtEnd: "2026-02-01T00:00:00Z",
  }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { filter: { dueAt: unknown } } }).input.filter.dueAt,
    { start: "2026-01-01T00:00:00Z", end: "2026-02-01T00:00:00Z" },
  );
});

Deno.test("post-list: startDate/endDate stay top-level — they mean createdAt OR dueAt", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({
    organizationId: "o1",
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-02-01T00:00:00Z",
  }, ctx);
  const filter =
    (gqlOf(calls[0]).variables as { input: { filter: Record<string, unknown> } }).input.filter;
  assertEquals(filter.startDate, "2026-01-01T00:00:00Z");
  assertEquals(filter.endDate, "2026-02-01T00:00:00Z");
  assertEquals(filter.dueAt, undefined);
});

Deno.test("post-list: channel and tag ids split on commas", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1", channelIds: "c1, c2", tagIds: "t1" }, ctx);
  const filter =
    (gqlOf(calls[0]).variables as { input: { filter: Record<string, unknown> } }).input.filter;
  assertEquals(filter.channelIds, ["c1", "c2"]);
  assertEquals(filter.tagIds, ["t1"]);
});

Deno.test("post-list: a primary sort gains Buffer's own createdAt desc tie-breaker", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1", sortField: "dueAt", sortDirection: "asc" }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { sort: unknown } }).input.sort,
    [
      { field: "dueAt", direction: "asc" },
      { field: "createdAt", direction: "desc" },
    ],
  );
});

Deno.test("post-list: sorting by createdAt does not append a duplicate tie-breaker", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute(
    { organizationId: "o1", sortField: "createdAt", sortDirection: "desc" },
    ctx,
  );
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { sort: unknown[] } }).input.sort.length,
    1,
  );
});

Deno.test("post-list: no sort is invented when none is asked for", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1" }, ctx);
  assertEquals((gqlOf(calls[0]).variables as { input: { sort?: unknown } }).input.sort, undefined);
});

Deno.test("post-list: page size has no default — the CLI's 25 is not the API's", () => {
  const p = (postList.params ?? []).find((p) => p.key === "first")!;
  assertEquals(p.default, undefined);
});

Deno.test("post-list: the response carries edges, cursors and pageInfo", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postList.execute({ organizationId: "o1" }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/edges\s*\{\s*cursor/.test(query), query);
  assert(/pageInfo \{ hasNextPage hasPreviousPage startCursor endCursor \}/.test(query), query);
});
