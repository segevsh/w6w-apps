import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-bitlink-clicks.ts";

Deno.test("get-bitlink-clicks: GETs /bitlinks/{bitlink}/clicks with unit/units defaults", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        link_clicks: [{ date: "2026-07-30T00:00:00+0000", clicks: 3 }],
        unit: "day",
        units: -1,
      },
    },
  ]);
  const out = await action.execute({ bitlink: "bit.ly/abc123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/bitlinks/bit.ly/abc123/clicks");
  assertEquals(url.searchParams.get("unit"), "day");
  assertEquals(url.searchParams.get("units"), "-1");
  assertEquals(out.link_clicks[0].clicks, 3);
});

Deno.test("get-bitlink-clicks: passes a custom unit, units and unitReference", async () => {
  const { ctx, calls } = mockCtx([{ body: { link_clicks: [], unit: "week", units: 4 } }]);
  await action.execute({
    bitlink: "bit.ly/abc123",
    unit: "week",
    units: 4,
    unitReference: "2026-07-01T00:00:00Z",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("unit"), "week");
  assertEquals(url.searchParams.get("units"), "4");
  assertEquals(url.searchParams.get("unit_reference"), "2026-07-01T00:00:00Z");
});
