import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-bitlink-clicks-summary.ts";

Deno.test("get-bitlink-clicks-summary: GETs /bitlinks/{bitlink}/clicks/summary with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { total_clicks: 42, unit: "day", units: -1 } }]);
  const out = await action.execute({ bitlink: "bit.ly/abc123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/bitlinks/bit.ly/abc123/clicks/summary");
  assertEquals(url.searchParams.get("unit"), "day");
  assertEquals(url.searchParams.get("units"), "-1");
  assertEquals(out.total_clicks, 42);
});
