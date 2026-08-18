import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shipment-list.ts";

const list = (shipments: unknown[], has_more = false) => ({
  status: 200,
  body: { shipments, has_more },
});

Deno.test("shipment-list: unfiltered, it sends no purchased filter", async () => {
  const { ctx, calls } = mockCtx([list([{ id: "shp_1" }])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.easypost.com/v2/shipments");
  assertEquals(new URL(calls[0].url).searchParams.get("purchased"), null);
  assertEquals(result.count, 1);
});

/** Quotes that were abandoned are what a cancelled order leaves behind. */
Deno.test("shipment-list: the unpurchased filter sends a real false", async () => {
  const unbought = mockCtx([list([])]);
  await action.execute!({ purchased: "false" }, unbought.ctx);
  assertEquals(new URL(unbought.calls[0].url).searchParams.get("purchased"), "false");

  const boughtOnly = mockCtx([list([])]);
  await action.execute!({ purchased: "true" }, boughtOnly.ctx);
  assertEquals(new URL(boughtOnly.calls[0].url).searchParams.get("purchased"), "true");
});

Deno.test("shipment-list: the page size is capped at EasyPost's maximum", async () => {
  const { ctx, calls } = mockCtx([list([])]);
  await action.execute!({ limit: 5000 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("page_size"), "100");
});

Deno.test("shipment-list: has_more is reported so a caller knows it truncated", async () => {
  const { ctx } = mockCtx([list([{ id: "shp_1" }], true)]);
  const result = await action.execute!({}, ctx) as { has_more: boolean };
  assertEquals(result.has_more, true);
});

/** Five requests a second across list endpoints makes a paging loop a 429. */
Deno.test("shipment-list: says why it fetches one page rather than walking", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) =>
    p.key === "limit"
  )!;
  assert(/five requests a second/.test(p.hint!), p.hint);
});
