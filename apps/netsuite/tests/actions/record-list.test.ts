import { assertEquals, assertRejects } from "@std/assert";
import recordList from "../../actions/record-list.ts";
import { BASE, mockCtx, run } from "../_helpers.ts";

const PAGE = {
  items: [{ id: "107", links: [] }, { id: "41", links: [] }],
  count: 2,
  offset: 0,
  hasMore: true,
  totalResults: 3,
};

Deno.test("record-list: filter, limit and offset go in the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await run(recordList, {
    recordType: "customer",
    q: 'email START_WITH "barbara"',
    limit: 2,
    offset: 0,
  }, ctx);
  assertEquals(
    calls[0].url,
    `${BASE}/services/rest/record/v1/customer?q=email%20START_WITH%20%22barbara%22&limit=2&offset=0`,
  );
  assertEquals(out, { ...PAGE });
});

Deno.test("record-list: defaults to a 1000-row first page and tolerates a sparse body", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const out = await run(recordList, { recordType: "vendor" }, ctx);
  assertEquals(calls[0].url, `${BASE}/services/rest/record/v1/vendor?limit=1000&offset=0`);
  assertEquals(out, { items: [], count: 0, offset: 0, hasMore: false, totalResults: null });
});

Deno.test("record-list: an offset that is not a multiple of the limit is refused locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await run(recordList, { recordType: "customer", limit: 10, offset: 15 }, ctx),
    Error,
    "multiple of `limit`",
  );
  assertEquals(calls.length, 0);
});
