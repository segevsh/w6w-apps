import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/invoices-list.ts";

const sample = pageEnvelope([{ id: 6, object: "invoice" }], 1);

Deno.test("invoices-list: reads /invoices and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    status: "retry_failed",
    customer_membership: 7,
    store_order: 2,
    sort: "-due_date",
    page: 1,
    page_size: 50,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/invoices");
  assertEquals(url.searchParams.get("status"), "retry_failed");
  assertEquals(url.searchParams.get("customer_membership"), "7");
  assertEquals(url.searchParams.get("store_order"), "2");
  assertEquals(url.searchParams.get("sort"), "-due_date");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page_size"), "50");
  assertEquals(result.results.length, 1);
});

Deno.test("invoices-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
