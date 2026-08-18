import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tracker-list.ts";

const list = (trackers: unknown[], has_more = false) => ({
  status: 200,
  body: { trackers, has_more },
});

/** A label bought and never handed over sits at pre_transit and costs money. */
Deno.test("tracker-list: tallies the statuses so the stuck ones show up", async () => {
  const { ctx, calls } = mockCtx([list([
    { status: "in_transit" },
    { status: "pre_transit" },
    { status: "pre_transit" },
    { status: "delivered" },
  ])]);
  const result = await action.execute!({}, ctx) as {
    count: number;
    statusCounts: Record<string, number>;
  };
  assertEquals(calls[0].url.split("?")[0], "https://api.easypost.com/v2/trackers");
  assertEquals(result.count, 4);
  assertEquals(result.statusCounts, { in_transit: 1, pre_transit: 2, delivered: 1 });
});

Deno.test("tracker-list: a tracking number finds one parcel", async () => {
  const { ctx, calls } = mockCtx([list([])]);
  await action.execute!({ trackingCode: "1Z999" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("tracking_code"), "1Z999");
});

Deno.test("tracker-list: the page size is capped at EasyPost's maximum", async () => {
  const { ctx, calls } = mockCtx([list([])]);
  await action.execute!({ limit: 500 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("page_size"), "100");
});

Deno.test("tracker-list: names the label-bought-never-used case", () => {
  assert(/never handed over/.test(action.description!), action.description);
});
