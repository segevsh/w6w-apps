import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: maps the Statuspage rollup indicator and per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "minor", description: "Partial API disruption" },
      components: [
        { name: "API", status: "degraded_performance" },
        { name: "Web Player", status: "operational" },
        { name: "Group header", status: "operational", group: true },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://spotify.statuspage.io/api/v2/summary.json");
  assertEquals(out.state, "degraded");
  assertEquals(out.message, "Partial API disruption");
  assertEquals(out.components, {
    api: { state: "degraded" },
    "web-player": { state: "ok" },
  });
});

Deno.test("service: reports unknown, not down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
