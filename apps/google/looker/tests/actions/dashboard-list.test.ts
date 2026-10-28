import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dashboard-list.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const dashboards = [
  { id: "12", title: "Exec overview" },
  { id: "ecommerce::orders_overview", title: "Orders overview" },
  { id: "13", title: "Old exec", deleted: true },
];

/** Two kinds of dashboard share one list and only one is editable. */
Deno.test("dashboard-list: separates LookML dashboards from user-defined ones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: dashboards }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/api/4.0/dashboards");
  assertEquals(result.lookmlCount, 1);
  assertEquals(result.userDefinedCount, 1);
});

Deno.test("dashboard-list: excludes soft-deleted dashboards and counts them", async () => {
  const { ctx } = mockCtx([{ status: 200, body: dashboards }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.count, 2);
  assertEquals(result.deletedCount, 1);

  const all = mockCtx([{ status: 200, body: dashboards }], D);
  const withDeleted = await action.execute({ includeDeleted: true }, all.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(withDeleted.count, 3);
});

Deno.test("dashboard-list: filters on the title case-insensitively", async () => {
  const { ctx } = mockCtx([{ status: 200, body: dashboards }], D);
  const result = await action.execute({ title: "orders" }, ctx) as Record<string, unknown>;
  assertEquals(result.ids, ["ecommerce::orders_overview"]);
});

/** Each tile is its own warehouse query. */
Deno.test("dashboard-list: says a dashboard refresh is many queries", () => {
  assert(/each TILE is its own warehouse query/i.test(action.description!), action.description);
});
