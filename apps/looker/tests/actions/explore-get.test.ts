import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/explore-get.ts";

const D = { display: { host: "https://mycompany.cloud.looker.com" } };

const explore = {
  label: "Orders",
  connection_name: "warehouse",
  fields: {
    dimensions: [
      { name: "orders.id", label: "ID", type: "number", can_filter: true },
      { name: "orders.internal_key", label: "Key", hidden: true, can_filter: true },
    ],
    measures: [
      { name: "orders.count", label: "Count", type: "count", can_filter: true },
      { name: "orders.calc", label: "Calc", type: "number", can_filter: false },
    ],
  },
};

/** Selecting only measures gives one row; a dimension groups. */
Deno.test("explore-get: splits dimensions from measures", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: explore }], D);
  const result = await action.execute({ model: "ecommerce", explore: "orders" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/4.0/lookml_models/ecommerce/explores/orders",
  );
  assertEquals(result.dimensionCount, 1);
  assertEquals(result.measureCount, 2);
  assertEquals(result.connectionName, "warehouse");
});

/** Hidden means hidden from the picker, not from the API. */
Deno.test("explore-get: omits hidden fields by default and counts them anyway", async () => {
  const { ctx } = mockCtx([{ status: 200, body: explore }], D);
  const result = await action.execute({ model: "m", explore: "e" }, ctx) as Record<string, unknown>;
  const names = (result.dimensions as Array<{ name: string }>).map((d) => d.name);
  assertEquals(names, ["orders.id"]);
  assertEquals(result.hiddenCount, 1);
});

Deno.test("explore-get: includeHidden returns them, because the API can select them", async () => {
  const { ctx } = mockCtx([{ status: 200, body: explore }], D);
  const result = await action.execute(
    { model: "m", explore: "e", includeHidden: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals((result.dimensions as unknown[]).length, 2);
});

/** A filter on one of these is rejected in terms of the filter. */
Deno.test("explore-get: names the fields that cannot be filtered", async () => {
  const { ctx } = mockCtx([{ status: 200, body: explore }], D);
  const result = await action.execute({ model: "m", explore: "e" }, ctx) as Record<string, unknown>;
  assertEquals(result.unfilterable, ["orders.calc"]);
});

Deno.test("explore-get: both names are required before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ explore: "orders" }, ctx),
    Error,
    "`model`",
  );
  await assertRejects(
    async () => await action.execute({ model: "ecommerce" }, ctx),
    Error,
    "`explore`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("explore-get: the hint says an Explore name is not a LookML view", () => {
  const explore = action.params!.find((p) => p.key === "explore")!;
  assert(/not a LookML view name/.test(explore.hint!), explore.hint);
});
