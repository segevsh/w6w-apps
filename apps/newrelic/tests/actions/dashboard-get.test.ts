import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/dashboard-get.ts";

const dashboard = ok({
  actor: {
    entity: {
      guid: "d1",
      name: "Checkout",
      pages: [
        {
          name: "Overview",
          widgets: [
            {
              title: "Errors",
              rawConfiguration: {
                nrqlQueries: [{ accountId: 12345, query: "SELECT count(*) FROM TransactionError" }],
              },
            },
            { title: "A note", rawConfiguration: { text: "not a chart" } },
          ],
        },
        {
          name: "Detail",
          widgets: [
            {
              title: "Latency",
              rawConfiguration: {
                nrqlQueries: [{
                  accountId: 12345,
                  query: "SELECT average(duration) FROM Transaction",
                }],
              },
            },
          ],
        },
      ],
    },
  },
});

/**
 * Every widget carries the NRQL that draws it, which makes this the practical
 * way to lift a query out of a dashboard built in the UI.
 */
Deno.test("dashboard-get: pulls out every NRQL query with its page and widget", async () => {
  const { ctx } = mockCtx([dashboard], { display });
  const result = await action.execute!({ guid: "d1" }, ctx) as {
    queries: Array<{ page: string; widget: string; query: string }>;
    widgetCount: number;
  };
  assertEquals(result.widgetCount, 3);
  assertEquals(result.queries.length, 2, "the text widget has no query");
  assertEquals(result.queries[0].page, "Overview");
  assertEquals(result.queries[0].widget, "Errors");
  assert(result.queries[1].query.includes("average(duration)"), result.queries[1].query);
});

Deno.test("dashboard-get: a widget with no queries does not break the walk", async () => {
  const { ctx } = mockCtx([
    ok({ actor: { entity: { guid: "d1", pages: [{ widgets: [{ title: "x" }] }] } } }),
  ], { display });
  const result = await action.execute!({ guid: "d1" }, ctx) as {
    queries: unknown[];
    widgetCount: number;
  };
  assertEquals(result.widgetCount, 1);
  assertEquals(result.queries, []);
});

Deno.test("dashboard-get: a dashboard with no pages is not an error", async () => {
  const { ctx } = mockCtx([ok({ actor: { entity: { guid: "d1", name: "Empty" } } })], { display });
  const result = await action.execute!({ guid: "d1" }, ctx) as {
    widgetCount: number;
    pages: unknown[];
  };
  assertEquals(result.widgetCount, 0);
  assertEquals(result.pages, []);
});

Deno.test("dashboard-get: a missing dashboard is an error naming the GUID", async () => {
  const { ctx } = mockCtx([ok({ actor: { entity: null } })], { display });
  await assertRejects(
    async () => await action.execute!({ guid: "gone" }, ctx),
    Error,
    "no dashboard with GUID gone",
  );
});

Deno.test("dashboard-get: needs a guid", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`guid` is required");
  assertEquals(calls.length, 0);
});

/** rawConfiguration's shape depends on the visualisation. */
Deno.test("dashboard-get: says why the configuration is returned untyped", () => {
  assert(
    /rawConfiguration/.test(action.description!) || /NRQL behind each/.test(action.description!),
    action.description,
  );
});
