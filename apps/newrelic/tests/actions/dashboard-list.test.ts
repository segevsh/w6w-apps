import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/dashboard-list.ts";

const dashboards = ok({
  actor: {
    entitySearch: {
      count: 5,
      results: {
        entities: [{ guid: "d1", name: "Checkout" }, { guid: "d2", name: "Infra" }],
        nextCursor: "c1",
      },
    },
  },
});

/** There is no dashboards endpoint — a dashboard is an entity. */
Deno.test("dashboard-list: searches entities scoped to the dashboard type", async () => {
  const { ctx, calls } = mockCtx([dashboards], { display });
  const result = await action.execute!({}, ctx) as { count: number; total: number };
  const query = JSON.parse(calls[0].body!).variables.query;
  assert(query.includes("domain = 'VIZ'"), query);
  assert(query.includes("type = 'DASHBOARD'"), query);
  assert(query.includes("accountId = 12345"), query);
  assertEquals(result.count, 2);
  assertEquals(result.total, 5);
});

Deno.test("dashboard-list: a name filter is added to the clause", async () => {
  const { ctx, calls } = mockCtx([dashboards], { display });
  await action.execute!({ name: "Checkout" }, ctx);
  assert(JSON.parse(calls[0].body!).variables.query.includes("name LIKE 'Checkout'"));
});

Deno.test("dashboard-list: the cursor comes back for paging", async () => {
  const { ctx } = mockCtx([dashboards], { display });
  const result = await action.execute!({}, ctx) as { cursor: string };
  assertEquals(result.cursor, "c1");
});

Deno.test("dashboard-list: an account with no dashboards is a count of zero", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { entitySearch: { count: 0, results: { entities: [] } } } }),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("dashboard-list: says there is no dashboards endpoint", () => {
  assert(/no dashboards endpoint/.test(action.description!), action.description);
});
