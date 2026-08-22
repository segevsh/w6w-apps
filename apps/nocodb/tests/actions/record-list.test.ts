import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-list.ts";

const D = { display: { host: "https://nocodb.internal" } };
const page = (n: number, isLastPage = false) => ({
  status: 200,
  body: {
    list: Array.from({ length: n }, (_, i) => ({ Id: i + 1, Title: `Row ${i + 1}` })),
    pageInfo: { totalRows: 412, page: 1, pageSize: n, isFirstPage: true, isLastPage },
  },
  headers: { "x-ratelimit-remaining": "55" },
});

/** Sixty requests a minute makes a bigger page straightforwardly better. */
Deno.test("record-list: defaults to a page of 200 rather than NocoDB's 25", async () => {
  const { ctx, calls } = mockCtx([page(200)], D);
  const result = await action.execute({ tableId: "mtbl1" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/v2/tables/mtbl1/records");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "200");
  assertEquals(result.totalRows, 412);
  assertEquals(result.requestsRemaining, 55);
});

/** With spaces the filter matches nothing and returns 200. */
Deno.test("record-list: refuses a spaced filter before the request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", where: "(Status, eq, Active)" }, ctx),
    Error,
  );
  assert(/returns NOTHING/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("record-list: a valid filter, sort and field list reach the query", async () => {
  const { ctx, calls } = mockCtx([page(10, true)], D);
  await action.execute({
    tableId: "mtbl1",
    where: "(Status,eq,Active)~and(Amount,gt,100)",
    sort: "-CreatedAt, Name",
    fields: "Id, Title",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("where"), "(Status,eq,Active)~and(Amount,gt,100)");
  assertEquals(q.get("sort"), "-CreatedAt,Name");
  assertEquals(q.get("fields"), "Id,Title");
});

/** NocoDB applies your filter on top of the view's, not instead of it. */
Deno.test("record-list: says a view's filters are applied underneath", async () => {
  const { ctx, logs } = mockCtx([page(5, true)], D);
  const result = await action.execute(
    { tableId: "mtbl1", viewId: "vw1", where: "(Status,eq,Active)" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.viewApplied, true);
  assert(
    logs.some((l) => /intersection rather than the rows/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("record-list: computes the next offset until the last page", async () => {
  const more = mockCtx([page(200)], D);
  const first = await action.execute({ tableId: "mtbl1" }, more.ctx) as Record<string, unknown>;
  assertEquals(first.nextOffset, 200);
  assertEquals(first.isLastPage, false);

  const last = mockCtx([page(12, true)], D);
  const done = await action.execute({ tableId: "mtbl1", offset: 400 }, last.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(done.isLastPage, true);
  assertEquals(done.nextOffset, undefined);
});

Deno.test("record-list: the page size is clamped", async () => {
  const { ctx, calls } = mockCtx([page(1, true)], D);
  await action.execute({ tableId: "mtbl1", limit: 99999 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1000");
});

/** The rows are the customer's data. */
Deno.test("record-list: logs counts, never the rows", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { list: [{ Id: 1, Email: "ada@example.com" }], pageInfo: {} },
  }], D);
  await action.execute({ tableId: "mtbl1" }, ctx);
  assert(!/ada@example\.com/.test(JSON.stringify(logs)), JSON.stringify(logs));
});

Deno.test("record-list: requires a table id", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`tableId` is required");
});
