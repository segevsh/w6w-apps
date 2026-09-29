import { assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (overrides: Record<string, unknown> = {}) => ({
  page: { name: "Paperform" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { name: "API", status: "operational", group: false },
    { name: "Paperform Dashboard", status: "operational", group: false },
    { name: "Stepper", status: "operational", group: true },
    { name: "Stepper Dashboard", status: "degraded_performance", group: false },
  ],
  ...overrides,
});

Deno.test("service: declares key/kind and the status host's own allowlist", () => {
  assertEquals(service.key, "service");
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["paperform.statuspage.io"]);
});

Deno.test("service: ok when the indicator is none, and skips group rows", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary() }]);
  const out = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components ?? {}).includes("stepper"), false);
  assertEquals(Object.keys(out.components ?? {}).includes("api"), true);
});

Deno.test("service: degraded on a minor indicator", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary({ status: { indicator: "minor", description: "Partial outage" } }),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("service: down on a critical indicator", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: summary({ status: { indicator: "critical" } }),
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("service: unknown, never down, when the status page itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown when the page no longer self-identifies as Paperform", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary({ page: { name: "Some Other Page" } }) }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
