import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/group-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("group-list: calls GET /v3/groups with the order", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "News" }, { id: 2, name: "VIP" }] }]);
  const out = await action.execute({ order: "created DESC" }, ctx) as {
    items: unknown[];
    count: number;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/groups");
  assertEquals(queryOf(calls[0].url), { order: "created DESC" });
  assertEquals(out.count, 2);
});

test("group-list: rejects an order outside the documented set before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ order: "name ASC" }, ctx),
    Error,
    "`order` must be one of",
  );
  assertEquals(calls.length, 0);
});

test("group-list: keeps a non-array body as raw", async () => {
  const { ctx } = mockCtx([{ body: { odd: true } }]);
  const out = await action.execute({}, ctx) as { items: unknown[]; raw: unknown };
  assertEquals(out.items, []);
  assertEquals(out.raw, { odd: true });
});
