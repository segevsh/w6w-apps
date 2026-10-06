import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: calls GET /v3/tags with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ tag: "hero" }] }]);
  const out = await action.execute({
    groupId: "5",
    origin: "*",
    orderBy: "count",
    limit: 10,
    page: 1,
  }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v3/tags");
  assertEquals(queryOf(calls[0].url), {
    group_id: "5",
    origin: "*",
    order_by: "count",
    limit: "10",
    page: "1",
  });
  assertEquals(out.count, 1);
});

Deno.test("tag-list: rejects an order outside the documented set", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ orderBy: "name" }, ctx),
    Error,
    "`orderBy` must be one of",
  );
  assertEquals(calls.length, 0);
});
