import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-outbound-stats.ts";

Deno.test("get-outbound-stats: GETs /stats/outbound with no query string when unfiltered", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Sent: 100, Bounced: 1 } }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://api.postmarkapp.com/stats/outbound");
});

Deno.test("get-outbound-stats: forwards tag/fromdate/todate/messageStream filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    { tag: "welcome", fromdate: "2026-01-01", todate: "2026-01-31", messageStream: "outbound" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("tag"), "welcome");
  assertEquals(url.searchParams.get("fromdate"), "2026-01-01");
  assertEquals(url.searchParams.get("todate"), "2026-01-31");
  assertEquals(url.searchParams.get("messagestream"), "outbound");
});
