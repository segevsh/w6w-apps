import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/list-customers.ts";
import { API_ROOT, exec, mockCtx } from "../_helpers.ts";

Deno.test("list-customers: GETs /v3/customers with deepObject filters and paging", async () => {
  const resp = { paging: { current_page: 1, count_items: 1 }, data: [{ id: 1, name: "A" }] };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await exec(
    action,
    { fulltext: "acme", active: true, page: 1, itemsPerPage: 10 },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_ROOT}/v3/customers`);
  assertEquals(url.searchParams.get("filter[fulltext]"), "acme");
  assertEquals(url.searchParams.get("filter[active]"), "true");
  assertEquals(url.searchParams.get("items_per_page"), "10");
  assertEquals(out, resp);
});

Deno.test("list-customers: no filters means no query string; a non-array data becomes []", async () => {
  const { ctx, calls } = mockCtx([{ body: { paging: null } }]);
  const out = await exec(action, {}, ctx);
  assertEquals(calls[0].url, `${API_ROOT}/v3/customers`);
  assertEquals(out, { paging: null, data: [] });
  const bad = mockCtx([{
    status: 403,
    body: { errors: [{ type: "Forbidden", message: "no access" }] },
  }]);
  await assertRejects(() => exec(action, {}, bad.ctx), Error, "no access");
});
