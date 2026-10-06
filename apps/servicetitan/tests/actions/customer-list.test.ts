import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("customer-list: GETs /crm/v2/tenant/{t}/customers with filters, ids joined by commas", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { page: 1, data: [], hasMore: false } }],
    conn,
  );
  const out = await action.execute!(
    { ids: "1, 2", name: "Smith", active: "Any", pageSize: 25, includeTotal: true, page: 2 },
    ctx,
  ) as { hasMore: boolean };
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.servicetitan.io/crm/v2/tenant/42/customers");
  assertEquals(url.searchParams.get("ids"), "1,2");
  assertEquals(url.searchParams.get("name"), "Smith");
  assertEquals(url.searchParams.get("active"), "Any");
  assertEquals(url.searchParams.get("pageSize"), "25");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("includeTotal"), "true");
  assertEquals(out.hasMore, false);
  assertEquals(calls[0].method, "GET");
});

Deno.test("customer-list: unset filters are omitted, and a non-numeric id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  let threw = false;
  try {
    await action.execute!({ ids: "1,abc" }, mockCtx([], conn).ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
