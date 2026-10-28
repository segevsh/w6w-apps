import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/get-customer.ts";

const OK = { status: 200, body: { results: [{ customer: { id: "1234567890" } }] } };

Deno.test("get-customer: queries FROM customer with no WHERE clause", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.startsWith("SELECT customer.resource_name, customer.id"));
  assert(q.includes("FROM customer"));
  // `FROM customer` always returns the addressed account, so an id predicate
  // would be redundant.
  assert(!q.includes("WHERE"));
  assert(q.endsWith("LIMIT 1"));
});

Deno.test("get-customer: selects the account's identity and settings", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  for (
    const f of [
      "customer.descriptive_name",
      "customer.currency_code",
      "customer.time_zone",
      "customer.manager",
      "customer.test_account",
      "customer.status",
    ]
  ) assert(q.includes(f), `missing ${f}`);
});

Deno.test("get-customer: appends extra fields to the SELECT list", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ extraFields: "customer.optimization_score, metrics.clicks" }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("customer.optimization_score, metrics.clicks FROM customer"));
});

Deno.test("get-customer: refuses an extraFields value that is not a field path", () => {
  const { ctx } = mockAdsCtx([OK]);
  assertThrows(
    () => action.execute({ extraFields: "campaign.id FROM campaign" }, ctx),
    Error,
    "not a valid field path",
  );
});

Deno.test("get-customer: honours the customerId override", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ customerId: "222-222-2222" }, ctx);
  assertEquals(
    calls[0].url,
    "https://googleads.googleapis.com/v25/customers/2222222222/googleAds:search",
  );
});
