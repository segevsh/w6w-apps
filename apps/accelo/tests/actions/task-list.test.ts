import { assertEquals, assertRejects } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: GETs /tasks with default paging and unwraps the envelope", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: [{ id: "1" }, { id: "2" }] },
  }]);
  const out = await action.execute({}, ctx);
  assertEquals(out, { items: [{ id: "1" }, { id: "2" }], page: 0, limit: 50, hasMore: false });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/tasks?_page=0&_limit=50");
});

Deno.test("task-list: sends search, filters, ordering and extra fields; a full page may have more", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: [{ id: "9" }] },
  }]);
  const out = await action.execute({
    limit: 1,
    page: 2,
    search: "kurt",
    filters: "id(9)",
    orderBy: "date_created",
    orderDirection: "desc",
    fields: "_ALL",
  }, ctx) as { hasMore: boolean; page: number };
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v0/tasks");
  assertEquals(url.searchParams.get("_page"), "2");
  assertEquals(url.searchParams.get("_limit"), "1");
  assertEquals(url.searchParams.get("_search"), "kurt");
  assertEquals(url.searchParams.get("_filters"), "id(9),order_by_desc(date_created)");
  assertEquals(url.searchParams.get("_fields"), "_ALL");
  assertEquals(out.hasMore, true);
  assertEquals(out.page, 2);
});

Deno.test("task-list: surfaces Accelo's own error message", async () => {
  const { ctx } = mockAcceloCtx([{
    status: 400,
    body: { meta: { status: "invalid_request", message: "bad filter" }, response: null },
  }]);
  await assertRejects(async () => await action.execute({}, ctx), Error, "invalid_request");
});
