import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const summary = (indicator: string, components: unknown[] = []) => ({
  status: { indicator, description: "All Systems Operational" },
  components,
});

Deno.test("service: probes Confluence's own Statuspage, not the cross-product rollup", () => {
  // A Jira incident is not a Confluence incident; the sibling app probes its own.
  assertEquals(service.network?.allow, ["confluence.status.atlassian.com"]);
  assertEquals(service.kind, "service");
});

Deno.test("service: an operational rollup is ok, with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: summary("none", [
      { name: "Editing", status: "operational" },
      { name: "Search", status: "degraded_performance" },
      { name: "Group header", status: "operational", group: true },
    ]),
  }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, "https://confluence.status.atlassian.com/api/v2/summary.json");
  assertEquals(result.state, "ok");
  assertEquals(result.components, {
    editing: { state: "ok" },
    search: { state: "degraded" },
  });
});

Deno.test("service: minor degrades, major and critical are down", async () => {
  for (
    const [indicator, state] of [["minor", "degraded"], ["major", "down"], ["critical", "down"]]
  ) {
    const { ctx } = mockCtx([{ status: 200, body: summary(indicator) }]);
    assertEquals((await service.check!({} as never, ctx)).state, state, indicator);
  }
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "" }]);
  const result = await service.check!({} as never, ctx);
  assertEquals(result.state, "unknown");
  assertEquals(result.message, "status API returned 502");
});
