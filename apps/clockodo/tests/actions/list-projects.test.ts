import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-projects.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("list-projects: GETs /v4/projects with deepObject filters and paging", async () => {
  const resp = { paging: { current_page: 1, count_items: 1 }, data: [{ id: 1, name: "A" }] };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await exec(action, {
    fulltext: "acme",
    active: true,
    page: 1,
    itemsPerPage: 10,
    customersId: 3,
    completed: false,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_ROOT}/v4/projects`);
  assertEquals(url.searchParams.get("filter[fulltext]"), "acme");
  assertEquals(url.searchParams.get("filter[active]"), "true");
  assertEquals(url.searchParams.get("items_per_page"), "10");
  assertEquals(url.searchParams.get("filter[customers_id]"), "3");
  assertEquals(url.searchParams.get("filter[completed]"), "false");
  assertEquals(out, resp);
});

Deno.test("list-projects: no filters means no query string; a non-array data becomes []", async () => {
  const { ctx, calls } = mockCtx([{ body: { paging: null } }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/v4/projects`);
  assertEquals(out, { paging: null, data: [] });
  const bad = mockCtx([{
    status: 403,
    body: { errors: [{ type: "Forbidden", message: "no access" }] },
  }]);
  await assertRejects(() => exec(action, {}, bad.ctx), Error, "no access");
});
