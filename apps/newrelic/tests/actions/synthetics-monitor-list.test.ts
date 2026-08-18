import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/synthetics-monitor-list.ts";

const monitors = ok({
  actor: {
    entitySearch: {
      count: 3,
      results: {
        entities: [
          { guid: "m1", name: "Homepage", reporting: true, monitorSummary: { status: "SUCCESS" } },
          { guid: "m2", name: "Checkout", reporting: true, monitorSummary: { status: "FAILING" } },
          { guid: "m3", name: "Old", reporting: false, monitorSummary: {} },
        ],
        nextCursor: null,
      },
    },
  },
});

Deno.test("synthetics-monitor-list: searches entities scoped to monitors", async () => {
  const { ctx, calls } = mockCtx([monitors], { display });
  const result = await action.execute!({}, ctx) as { count: number; total: number };
  const query = JSON.parse(calls[0].body!).variables.query;
  assert(query.includes("domain = 'SYNTH'"), query);
  assert(query.includes("type = 'MONITOR'"), query);
  assertEquals(result.count, 3);
  assertEquals(result.total, 3);
});

/**
 * A monitor can be failing (the site is down) or simply not running (disabled,
 * or no locations) — and the second one is silent.
 */
Deno.test("synthetics-monitor-list: failing and not-running are counted separately", async () => {
  const { ctx } = mockCtx([monitors], { display });
  const result = await action.execute!({}, ctx) as {
    failing: number;
    notReporting: number;
  };
  assertEquals(result.failing, 1);
  assertEquals(result.notReporting, 1);
});

Deno.test("synthetics-monitor-list: a name filter is added to the clause", async () => {
  const { ctx, calls } = mockCtx([monitors], { display });
  await action.execute!({ name: "Check" }, ctx);
  assert(JSON.parse(calls[0].body!).variables.query.includes("name LIKE 'Check'"));
});

Deno.test("synthetics-monitor-list: an account with no monitors is a count of zero", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { entitySearch: { count: 0, results: { entities: [] } } } }),
  ], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

/** No alerts and nothing running produce the same silence. */
Deno.test("synthetics-monitor-list: says the two silences look identical", () => {
  assert(
    /'no\s+alerts' and 'nothing running' look identical/.test(action.description!),
    action.description,
  );
});
