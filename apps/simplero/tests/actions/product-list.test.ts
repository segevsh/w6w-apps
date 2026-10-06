import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/product-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("product-list: is a read action that declares the shared pagination params", () => {
  assertEquals(action.key, "product-list");
  assertEquals(action.type, "read");
  const keys = action.params!.map((p) => p.key);
  for (const k of ["page", "perPage", "after"]) assert(keys.includes(k), `missing ${k}`);
  assertEquals(keys.includes("q"), true);
});

Deno.test("product-list: GETs /api/v2/products and folds the data/pagination envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: listBody([{ id: 1 }, { id: 2 }], { page: 1, per_page: 20, total: 2, total_pages: 1 }) },
  ]);
  const out = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/products");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals((out.items as unknown[]).length, 2);
  assertEquals(out.total, 2);
  assertEquals(out.hasMore, false);
});

Deno.test("product-list: maps its inputs onto Simplero's snake_case / bracketed query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await action.execute({ page: 2, perPage: 50, after: 100 }, ctx);
  assertEquals(queryOf(calls[0].url), { ...{}, page: "2", per_page: "50", after: "100" });
});

Deno.test("product-list: sends the free-text search as q", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([]) }]);
  await action.execute({ q: "anna" }, ctx);
  assertEquals(queryOf(calls[0].url), { q: "anna" });
});

Deno.test("product-list: hasMore is true while pages remain", async () => {
  const { ctx } = mockCtx([
    {
      body: listBody([{ id: 1 }], {
        page: 1,
        per_page: 1,
        total: 3,
        total_pages: 3,
        next_after: 1,
      }),
    },
  ]);
  const out = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.hasMore, true);
  assertEquals(out.nextAfter, 1);
  assertEquals(out.totalPages, 3);
});

Deno.test("product-list: under cursor paging a full page means more may follow", async () => {
  const { ctx } = mockCtx([
    {
      body: listBody([{ id: 5 }, { id: 6 }], {
        page: null,
        per_page: 2,
        total: null,
        total_pages: null,
        next_after: 6,
      }),
    },
  ]);
  const out = await action.execute({ after: 4, perPage: 2 }, ctx) as Record<string, unknown>;
  assertEquals(out.hasMore, true);
  assertEquals(out.nextAfter, 6);
  assertEquals(out.page, null);
});

Deno.test("product-list: a Bad API key 401 surfaces Simplero's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Bad API key" } }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "Bad API key");
});

Deno.test("product-list: a 200 whose body is not a data array is an error", async () => {
  const { ctx } = mockCtx([{ body: { nope: true } }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "no `data` array");
});
