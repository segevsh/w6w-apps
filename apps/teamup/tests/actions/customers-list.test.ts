import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/customers-list.ts";

const sample = pageEnvelope([{ id: 12, object: "customer" }], 1);

Deno.test("customers-list: reads /customers and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    status: "active",
    query: "ada",
    ids: "1,2",
    deleted: true,
    age_gte: 18,
    family: 9,
    active_memberships: false,
    can_delete: true,
    page: 2,
    page_size: 25,
    expand: "provider",
    providerId: 77,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/customers");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("query"), "ada");
  assertEquals(url.searchParams.get("ids"), "1,2");
  assertEquals(url.searchParams.get("deleted"), "true");
  assertEquals(url.searchParams.get("age_gte"), "18");
  assertEquals(url.searchParams.get("family"), "9");
  assertEquals(url.searchParams.get("active_memberships"), "false");
  assertEquals(url.searchParams.get("can_delete"), "true");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("page_size"), "25");
  assertEquals(url.searchParams.get("expand"), "provider");
  assertEquals(calls[0].headers["teamup-provider-id"], "77");
  assertEquals(result.count, 1);
  assertEquals(result.results.length, 1);
});

Deno.test("customers-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

/** TeamUp's page_size default is also its ceiling. */
Deno.test("customers-list: declares the documented page size ceiling", () => {
  const pageSize = action.params!.find((p) => p.key === "page_size")!;
  assertEquals(pageSize.default, 100);
  assertEquals(pageSize.validation?.max, 100);
});
