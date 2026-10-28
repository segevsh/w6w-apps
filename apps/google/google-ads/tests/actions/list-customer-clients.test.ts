import { assert, assertEquals } from "@std/assert";
import { bodyOf, mockAdsCtx, queryOf } from "../_helpers.ts";
import action from "../../actions/list-customer-clients.ts";

const OK = { status: 200, body: { results: [] } };

Deno.test("list-customer-clients: queries FROM customer_client and hides hidden accounts", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("FROM customer_client"));
  assert(q.includes("WHERE customer_client.hidden = FALSE"));
  assert(q.includes("ORDER BY customer_client.level"));
});

Deno.test("list-customer-clients: includeHidden drops the hidden filter", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ includeHidden: true }, ctx);
  const q = queryOf(calls[0]);
  // Still selected as a column — just no longer filtered on.
  assert(q.includes("customer_client.hidden,"));
  assert(!q.includes("WHERE"));
});

Deno.test("list-customer-clients: managersOnly narrows to managers", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ managersOnly: true }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("customer_client.hidden = FALSE AND customer_client.manager = TRUE"));
});

Deno.test("list-customer-clients: appends a raw WHERE and a LIMIT", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ where: "customer_client.level = 1", limit: 25 }, ctx);
  const q = queryOf(calls[0]);
  assert(q.includes("AND customer_client.level = 1"));
  assert(q.endsWith("LIMIT 25"));
});

Deno.test("list-customer-clients: forwards the page token", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({ pageToken: "tok" }, ctx);
  assertEquals(bodyOf(calls[0]).pageToken, "tok");
});

Deno.test("list-customer-clients: selects the fields that make a tree readable", async () => {
  const { ctx, calls } = mockAdsCtx([OK]);
  await action.execute({}, ctx);
  const q = queryOf(calls[0]);
  for (
    const f of [
      "customer_client.client_customer",
      "customer_client.level",
      "customer_client.manager",
      "customer_client.descriptive_name",
    ]
  ) assert(q.includes(f), `missing ${f}`);
});
