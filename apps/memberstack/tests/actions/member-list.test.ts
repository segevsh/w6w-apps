import { assertEquals } from "@std/assert";
import memberList from "../../actions/member-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("member-list: sends paging params and maps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { totalCount: 25, endCursor: 456, hasNextPage: true, data: [{ id: "mem_1" }] },
  }]);
  const out = await memberList.execute(
    { limit: 10, after: 123, order: "DESC", includeJSON: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/members");
  assertEquals(queryOf(calls[0].url), {
    limit: "10",
    after: "123",
    order: "DESC",
    includeJSON: "true",
  });
  assertEquals(out, {
    members: [{ id: "mem_1" }],
    totalCount: 25,
    endCursor: 456,
    hasNextPage: true,
  });
});

Deno.test("member-list: omits unset params, including includeJSON=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], hasNextPage: false } }]);
  await memberList.execute({ includeJSON: false }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
