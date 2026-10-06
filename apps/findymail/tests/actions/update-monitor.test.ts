import { assertEquals } from "@std/assert";
import action from "../../actions/update-monitor.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("update-monitor: PATCHes the monitor path with only set fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 4, "name": "Renamed" } }]);
  const out = await action.execute!(
    {
      "id": 4,
      "name": "Renamed",
      "enrichment_level": "email_phone",
      "engagement_types": ["like", "comment"],
    } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/signals/monitors/4");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Renamed",
    "engagement_types": ["like", "comment"],
    "enrichment_level": "email_phone",
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "id": 4, "name": "Renamed" });
});
