import { assertEquals } from "@std/assert";
import { mockNationBuilderCtx } from "../_helpers.ts";
import action from "../../actions/person-list.ts";

Deno.test("person-list: GETs /signups with pagination and sort", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{ body: { data: [], meta: {} } }]);
  await action.execute({ pageSize: 10, pageNumber: 2, sort: "-created_at" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/signups");
  assertEquals(url.searchParams.get("page[size]"), "10");
  assertEquals(url.searchParams.get("page[number]"), "2");
  assertEquals(url.searchParams.get("sort"), "-created_at");
});

Deno.test("person-list: applies a JSON filter and flattens the results", async () => {
  const { ctx, calls } = mockNationBuilderCtx([{
    body: {
      data: [{ id: "1", type: "signups", attributes: { email: "a@b.com" } }],
      meta: { stats: { total: { count: 1 } } },
    },
  }]);
  const out = await action.execute({ filter: { email: "a@b.com" } }, ctx) as {
    items: unknown[];
    meta: unknown;
  };
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("filter[email]"), "a@b.com");
  assertEquals(out.items, [{ id: "1", type: "signups", email: "a@b.com" }]);
  assertEquals(out.meta, { stats: { total: { count: 1 } } });
});
